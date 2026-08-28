import { NextResponse } from "next/server";

// Lightweight warm-up endpoint. Point a free uptime monitor (e.g. UptimeRobot,
// every 5 min) at /api/ping to keep the serverless function AND the database
// connection warm, so real page loads avoid a cold start. Public (no auth).
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    if (process.env.DATABASE_URL) {
      const { getDb } = await import("@/db");
      const { sql } = await import("drizzle-orm");
      await getDb().execute(sql`select 1`);
      db = true;
    }
  } catch {
    db = false;
  }
  return NextResponse.json({ ok: true, db, ms: Date.now() - started });
}
