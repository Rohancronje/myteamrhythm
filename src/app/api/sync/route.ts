import { NextResponse } from "next/server";
import { PcoClient, pcoConfigFromEnv } from "@/lib/pco/client";

// Verifies the Planning Center connection and lists service types so you can
// build PCO_SERVICE_TYPE_MAP. This is the "Phase 0 data probe" — hit it once your
// token is in .env.local to confirm the pipe works before wiring the full sync.
//
//   GET /api/sync         → verify token + list service types
//   POST /api/sync        → pull scheduled assignments (writes once DB is wired)

export async function GET() {
  let config;
  try {
    config = pcoConfigFromEnv();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }

  const client = new PcoClient(config);
  try {
    const serviceTypes = await client.listServiceTypes();
    return NextResponse.json({
      ok: true,
      hint: "Map these ids into PCO_SERVICE_TYPE_MAP as '<id>:sunday_am,...'",
      serviceTypes,
      mapped: config.serviceTypeMap,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  let config;
  try {
    config = pcoConfigFromEnv();
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
  if (Object.keys(config.serviceTypeMap).length === 0) {
    return NextResponse.json(
      { ok: false, error: "PCO_SERVICE_TYPE_MAP is empty. Call GET /api/sync first." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const since: string = body.since ?? isoWeeksAgo(26);

  const client = new PcoClient(config);
  try {
    const rows = await client.fetchScheduledSince(since);
    // TODO: upsert people, pseudonyms, and serving_events here once DATABASE_URL
    // is configured (see src/db/schema.ts). For the probe we just report shape.
    return NextResponse.json({
      ok: true,
      since,
      assignments: rows.length,
      sample: rows.slice(0, 5).map((r) => ({
        serviceType: r.serviceType,
        date: r.date,
        status: r.status,
        position: r.position,
      })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

function isoWeeksAgo(weeks: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}
