import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pcoConfigFromEnv } from "@/lib/pco/client";
import { syncOnePlan, removePlan } from "@/lib/pco/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Receives Planning Center webhooks. On any plan change (roster swap, setlist
// edit, new/removed service) we re-fetch JUST that plan and update the DB — so
// changes land in seconds without polling or slow page loads. Verified against
// the subscription authenticity secret(s).

function verify(rawBody: string, header: string | null): boolean {
  const secrets = (process.env.PCO_WEBHOOK_SECRETS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (secrets.length === 0) return true; // not configured yet — accept (endpoint only triggers real re-syncs)
  if (!header) return false;
  for (const secret of secrets) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-pco-webhooks-authenticity"))) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  let body: { data?: { attributes?: { name?: string; payload?: string } }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const cfg = pcoConfigFromEnv();
  const results: string[] = [];

  for (const event of body.data ?? []) {
    const name = event.attributes?.name ?? "";
    if (!name.startsWith("services.v2.events.plan.")) continue; // plan.* only (covers roster + setlist)
    let payload: { data?: { id?: string; relationships?: { service_type?: { data?: { id?: string } } } } };
    try {
      payload = JSON.parse(event.attributes?.payload ?? "{}");
    } catch {
      continue;
    }
    const planId = payload.data?.id;
    const serviceTypeId = payload.data?.relationships?.service_type?.data?.id;
    if (!planId) continue;

    try {
      if (name.endsWith(".destroyed")) {
        await removePlan(planId);
        results.push(`removed ${planId}`);
      } else if (serviceTypeId) {
        const r = await syncOnePlan(serviceTypeId, planId, cfg);
        results.push(`${planId} -> ${r.where ?? "ignored"}`);
      }
    } catch (e) {
      results.push(`${planId} error: ${(e as Error).message}`);
    }
  }

  // A plan change can touch the roster, setlist and serving history — refresh the
  // affected caches so the change is visible in seconds, not after the TTL.
  if (results.length > 0) {
    revalidateTag("upcoming", "max");
    revalidateTag("team", "max");
    revalidateTag("songs", "max");
  }

  return NextResponse.json({ ok: true, handled: results });
}
