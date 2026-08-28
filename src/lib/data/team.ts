// The team data layer. Reads from Postgres when DATABASE_URL is set, otherwise
// from the local snapshot, otherwise an honest empty state. Produces real-name
// assessments for the pastoral view (handover section 3). Async throughout so it
// works against the DB on Vercel where local files aren't available.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { assess, type Assessment, type PersonEvent } from "@/lib/rhythm/assess";

interface SnapshotPerson {
  pcoId: string;
  handle: string;
  name: string;
  team: string;
  role: string;
  events: PersonEvent[];
}
interface Snapshot {
  generatedAt: string | null;
  anchor: string;
  windowWeeks: number;
  org: string;
  people: SnapshotPerson[];
}

export interface TeamMember {
  id: string;
  name: string;
  handle: string;
  team: string;
  role: string;
  initials: string;
  assessment: Assessment;
}
export interface TeamInfo {
  source: "planning-center" | "none";
  org: string;
  generatedAt: string | null;
}

async function loadSnapshot(): Promise<Snapshot | null> {
  if (process.env.DATABASE_URL) {
    const { readRosterSnapshot } = await import("@/db/read");
    const snap = await readRosterSnapshot();
    return snap.people.length ? snap : null;
  }
  try {
    return JSON.parse(readFileSync(join(process.cwd(), ".data", "pco-snapshot.json"), "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  // Drop quoted nicknames ("Nick") and bracketed segments ((Hyun Keun)) so we
  // don't derive initials from punctuation, then keep only letters.
  const cleaned = name
    .replace(/["'“”‘’][^"'“”‘’]*["'“”‘’]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\s]/gu, " ");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const letters = parts.map((n) => n[0]).slice(0, 2).join("");
  return (letters || name.replace(/[^\p{L}]/gu, "").charAt(0) || "?").toUpperCase();
}

async function build() {
  const snap = await loadSnapshot();
  if (!snap) {
    return { members: [], all: [], info: { source: "none", org: "NS Family Services", generatedAt: null } as TeamInfo };
  }

  const { nzNowAnchor } = await import("@/lib/time");
  const now = nzNowAnchor(); // real current date, anchored to NZ (handover rule 5)
  const all = snap.people.map((p): TeamMember => ({
    id: p.pcoId,
    name: p.name,
    handle: p.handle,
    team: p.team,
    role: p.role,
    initials: initials(p.name),
    assessment: assess(p.events, now, 26),
  }));
  const members = all.filter((m) => m.assessment.recentlyActive);
  return { members, all, info: { source: "planning-center", org: snap.org, generatedAt: snap.generatedAt } as TeamInfo };
}

// Cross-request cache: the roster + assessments only change when a sync writes new
// data, so we cache the whole computed result for a short window (refreshed on the
// nightly cron and on webhooks via revalidateTag("team")). This turns most page
// loads into a fast cache read instead of "fetch all people+events, reassess each".
const load = unstable_cache(build, ["rhythm:team"], { revalidate: 300, tags: ["team"] });

export async function getTeam(): Promise<TeamMember[]> {
  return (await load()).members;
}
export async function getTeamInfo(): Promise<TeamInfo> {
  return (await load()).info;
}
/** Every person in the roster window (not just recently active). */
export async function getAllMembers(): Promise<TeamMember[]> {
  return (await load()).all;
}
/** Distinct team names in the roster (for assigning coaches). */
export async function getTeamNames(): Promise<string[]> {
  const seen = new Set<string>();
  for (const m of (await load()).all) seen.add(m.team);
  return [...seen].sort((a, b) => a.localeCompare(b));
}
export async function getMember(id: string): Promise<TeamMember | undefined> {
  return (await load()).all.find((m) => m.id === id);
}

export async function isRecentlyActiveMember(id: string): Promise<boolean> {
  const m = (await load()).all.find((x) => x.id === id);
  return !!m?.assessment.recentlyActive;
}

const SEV: Record<string, number> = { elevated: 3, watch: 2, steady: 1 };

/** People worth a check-in (flagged), highest concern first. */
export function getFlagged(members: TeamMember[]): TeamMember[] {
  return members
    .filter((m) => m.assessment.status !== "steady")
    .sort((a, b) => SEV[b.assessment.status] - SEV[a.assessment.status] || b.assessment.streakWeeks - a.assessment.streakWeeks);
}

export interface TeamGroup {
  team: string;
  emoji: string;
  members: TeamMember[];
  flagged: number;
  status: "steady" | "watch" | "elevated";
}

const TEAM_EMOJI: { match: RegExp; emoji: string }[] = [
  { match: /worship|music|band|vocal/i, emoji: "🎵" },
  { match: /prod|media|audio|light|cam|slide|gfx|tech/i, emoji: "🎛️" },
  { match: /kid|child|next gen|pre-?school/i, emoji: "🧸" },
  { match: /welcom|host|door|carpark|usher|greet/i, emoji: "🤝" },
  { match: /cafe|kitchen|coffee|hospitalit/i, emoji: "☕" },
  { match: /online|stream/i, emoji: "💻" },
];
function emojiFor(team: string): string {
  return TEAM_EMOJI.find((t) => t.match.test(team))?.emoji ?? "✨";
}

/** Groups members by team, worst-status teams first. */
export function getTeamGroups(members: TeamMember[]): TeamGroup[] {
  const map = new Map<string, TeamMember[]>();
  for (const m of members) {
    const g = map.get(m.team) ?? [];
    g.push(m);
    map.set(m.team, g);
  }
  return [...map.entries()]
    .map(([team, ms]) => {
      const flagged = ms.filter((m) => m.assessment.status !== "steady").length;
      const hasElevated = ms.some((m) => m.assessment.status === "elevated");
      const status = hasElevated ? "elevated" : flagged > 0 ? "watch" : "steady";
      return { team, emoji: emojiFor(team), members: ms, flagged, status: status as TeamGroup["status"] };
    })
    .filter((g) => g.members.length >= 2)
    .sort((a, b) => SEV[b.status] - SEV[a.status] || b.flagged - a.flagged);
}

// ── Campus separation ────────────────────────────────────────────────────────
// One Planning Center org holds several campuses; the campus lives only in the
// team-name prefix (e.g. "NS Worship" vs "Dunedin"). We bucket by campus so a
// campus's teams and totals are never blended with another's.

const CAMPUS_ORDER = ["North Shore", "Dunedin", "Other"];

/** The campus a team belongs to, derived from its name. */
export function campusOf(team: string): string {
  const t = team.trim();
  if (/^ns\b/i.test(t)) return "North Shore";
  if (/dunedin/i.test(t)) return "Dunedin";
  return "Other";
}

export interface CampusSection {
  campus: string;
  groups: TeamGroup[];
  serving: number;
  flagged: number;
  status: "steady" | "watch" | "elevated";
}

/** Team groups bucketed by campus — campuses ordered NS → Dunedin → Other,
 *  teams within each campus already ordered by concern. Never blended. */
export function getCampusSections(members: TeamMember[]): CampusSection[] {
  const map = new Map<string, TeamGroup[]>();
  for (const g of getTeamGroups(members)) {
    const c = campusOf(g.team);
    const arr = map.get(c) ?? [];
    arr.push(g);
    map.set(c, arr);
  }
  return [...map.entries()]
    .map(([campus, groups]) => {
      const serving = groups.reduce((n, g) => n + g.members.length, 0);
      const flagged = groups.reduce((n, g) => n + g.flagged, 0);
      const status = groups.some((g) => g.status === "elevated") ? "elevated" : flagged > 0 ? "watch" : "steady";
      return { campus, groups, serving, flagged, status: status as CampusSection["status"] };
    })
    .sort((a, b) => {
      const ai = CAMPUS_ORDER.indexOf(a.campus), bi = CAMPUS_ORDER.indexOf(b.campus);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

/** One team by name (exact match), or undefined. Includes small teams too. */
export async function getTeamGroupByName(name: string): Promise<TeamGroup | undefined> {
  const members = (await load()).members.filter((m) => m.team === name);
  if (members.length === 0) return undefined;
  const flagged = members.filter((m) => m.assessment.status !== "steady").length;
  const hasElevated = members.some((m) => m.assessment.status === "elevated");
  const status = hasElevated ? "elevated" : flagged > 0 ? "watch" : "steady";
  return { team: name, emoji: emojiFor(name), members, flagged, status };
}
