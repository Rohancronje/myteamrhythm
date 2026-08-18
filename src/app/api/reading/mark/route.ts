import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { nzToday } from "@/lib/time";

// Marks today's reading as done for the signed-in person (drives the streak).
export async function POST() {
  const session = await getSession();
  if (!session?.personId) {
    return NextResponse.json({ ok: false, error: "no profile" }, { status: 400 });
  }
  if (process.env.DATABASE_URL) {
    try {
      const { getDb } = await import("@/db");
      const { readingMarks } = await import("@/db/schema");
      await getDb().insert(readingMarks).values({ pcoId: session.personId, day: nzToday() }).onConflictDoNothing();
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json({ ok: true });
}
