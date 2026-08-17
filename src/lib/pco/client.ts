// Planning Center Services API v2 client.
//
// Auth is HTTP Basic using a Personal Access Token: username = application id,
// password = secret. These live ONLY in environment variables (see .env.example)
// and must never be committed or logged. If a token ever lands in source control
// or a screenshot, rotate it immediately at
//   https://api.planningcenteronline.com/oauth/applications
//
// The Services API is JSON:API — resources come back under `data`, with related
// resources side-loaded under `included` when you pass ?include=.

import type { ScheduleStatus, ServiceTypeKey } from "@/lib/rhythm/types";

const BASE = "https://api.planningcenteronline.com/services/v2";

export interface PcoConfig {
  appId: string;
  secret: string;
  /** Map Planning Center service_type ids → our internal keys. */
  serviceTypeMap: Record<string, ServiceTypeKey>;
}

export function pcoConfigFromEnv(): PcoConfig {
  const appId = process.env.PCO_APP_ID;
  const secret = process.env.PCO_SECRET;
  if (!appId || !secret) {
    throw new Error(
      "Missing PCO_APP_ID / PCO_SECRET. Copy .env.example to .env.local and fill them in.",
    );
  }
  return {
    appId,
    secret,
    serviceTypeMap: parseServiceTypeMap(process.env.PCO_SERVICE_TYPE_MAP),
  };
}

function parseServiceTypeMap(raw?: string): Record<string, ServiceTypeKey> {
  // Format: "12345:sunday_am,12346:sunday_pm,12347:wednesday_night"
  if (!raw) return {};
  const out: Record<string, ServiceTypeKey> = {};
  for (const pair of raw.split(",")) {
    const [id, key] = pair.split(":").map((s) => s.trim());
    if (id && key) out[id] = key as ServiceTypeKey;
  }
  return out;
}

interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string; type: string } | null }>;
}

interface JsonApiPage {
  data: JsonApiResource[];
  included?: JsonApiResource[];
  links?: { next?: string };
  meta?: { total_count?: number };
}

export class PcoClient {
  private readonly auth: string;

  constructor(private readonly config: PcoConfig) {
    this.auth = "Basic " + Buffer.from(`${config.appId}:${config.secret}`).toString("base64");
  }

  private async get(path: string): Promise<JsonApiPage> {
    const url = path.startsWith("http") ? path : `${BASE}${path}`;
    const res = await fetch(url, {
      headers: { Authorization: this.auth, Accept: "application/json" },
      // PCO rate-limits; callers should paginate gently.
      cache: "no-store",
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get("Retry-After") ?? "3");
      await sleep(retry * 1000);
      return this.get(path);
    }
    if (!res.ok) {
      throw new Error(`PCO ${res.status} on ${url}: ${await res.text()}`);
    }
    return (await res.json()) as JsonApiPage;
  }

  /** Auto-paginates a collection endpoint, following JSON:API `links.next`. */
  private async getAll(path: string): Promise<{ data: JsonApiResource[]; included: JsonApiResource[] }> {
    const data: JsonApiResource[] = [];
    const included: JsonApiResource[] = [];
    let next: string | undefined = path;
    while (next) {
      const page: JsonApiPage = await this.get(next);
      data.push(...page.data);
      if (page.included) included.push(...page.included);
      next = page.links?.next;
    }
    return { data, included };
  }

  /** Verifies the token and returns the organisation name. */
  async verify(): Promise<{ ok: boolean; org?: string }> {
    const page = await this.get("/");
    const org = (page.data as unknown as JsonApiResource)?.attributes?.name as string | undefined;
    return { ok: true, org };
  }

  async listServiceTypes() {
    const { data } = await this.getAll("/service_types?per_page=100");
    return data.map((d) => ({ id: d.id, name: d.attributes.name as string }));
  }

  /**
   * Lists past plans for a service type back to `sinceISO`. Plans come newest
   * first; we stop paging once we pass the cutoff. `filter=past` keeps us to
   * services that have actually happened (real load, not future schedule).
   */
  async listPastPlans(serviceTypeId: string, sinceISO: string) {
    const plans: { id: string; date: string }[] = [];
    let next: string | undefined =
      `/service_types/${serviceTypeId}/plans?filter=past&order=-sort_date&per_page=50`;

    outer: while (next) {
      const page: JsonApiPage = await this.get(next);
      for (const plan of page.data) {
        const date = (plan.attributes.sort_date as string | null)?.slice(0, 10);
        if (!date) continue;
        if (date < sinceISO) break outer; // ordered desc — nothing older matters
        plans.push({ id: plan.id, date });
      }
      next = page.links?.next;
    }
    return plans;
  }

  /** Team members (PlanPerson rows) for one plan, with person + team side-loaded. */
  async planTeamMembers(serviceTypeId: string, planId: string) {
    const { data, included } = await this.getAll(
      `/service_types/${serviceTypeId}/plans/${planId}/team_members?include=person,team&per_page=100`,
    );
    const people = new Map(
      included
        .filter((r) => r.type === "Person")
        .map((r) => [r.id, r.attributes.full_name as string]),
    );
    const teams = new Map(
      included
        .filter((r) => r.type === "Team")
        .map((r) => [r.id, r.attributes.name as string]),
    );
    return data.map((m) => {
      const pid = m.relationships?.person?.data?.id ?? "";
      const tid = m.relationships?.team?.data?.id ?? "";
      return {
        personId: pid,
        personName: people.get(pid) ?? "Unknown",
        team: teams.get(tid) ?? "Unassigned",
        status: normaliseStatus(m.attributes.status as string),
        position: (m.attributes.team_position_name as string) ?? "",
      };
    });
  }

  /**
   * Pulls scheduled assignments (the core load signal) across all mapped service
   * types since `since`. Returns normalised ServingEvent-shaped rows, leaving the
   * personId as the raw PCO id for the caller to pseudonymise.
   */
  async fetchScheduledSince(
    sinceISO: string,
    onProgress?: (msg: string) => void,
  ) {
    const results: {
      personId: string;
      personName: string;
      team: string;
      serviceType: ServiceTypeKey;
      date: string;
      planId: string;
      status: ScheduleStatus;
      position: string;
    }[] = [];

    for (const [pcoId, key] of Object.entries(this.config.serviceTypeMap)) {
      const plans = await this.listPastPlans(pcoId, sinceISO);
      onProgress?.(`${key}: ${plans.length} plans since ${sinceISO}`);
      for (const plan of plans) {
        const members = await this.planTeamMembers(pcoId, plan.id);
        for (const m of members) {
          if (!m.personId) continue;
          results.push({
            personId: m.personId,
            personName: m.personName,
            team: m.team,
            serviceType: key,
            date: plan.date,
            planId: plan.id,
            status: m.status,
            position: m.position,
          });
        }
      }
    }
    return results;
  }
}

function normaliseStatus(s: string): ScheduleStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "c" || v === "confirmed") return "confirmed";
  if (v === "d" || v === "declined") return "declined";
  return "unconfirmed";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
