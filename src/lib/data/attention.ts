// The one number a coach or admin cares about at a glance: how many volunteers
// still need connecting with this cycle. Kept deliberately CHEAP — a couple of
// id/count queries — because it renders in the sidebar on every page. Never breaks
// a page (defensive → null on any error).

import type { SessionUser } from "@/lib/auth/session";
import { nzToday, nzDateOf } from "@/lib/time";

export interface Attention {
  count: number;
  label: string;
  href: string;
}

export async function getAttention(session: SessionUser): Promise<Attention | null> {
  if (!process.env.DATABASE_URL) return null;
  if (session.role !== "admin" && session.role !== "coach") return null;
  try {
    const { getDb } = await import("@/db");
    const { teamMembers, connections, teamCoaches } = await import("@/db/schema");
    const { eq, inArray, gte } = await import("drizzle-orm");
    const d = getDb();
    // "This cycle" = this calendar month (NZ). Over-fetch a couple of days around the
    // UTC month edge, then filter precisely by NZ date so it's correct across DST.
    const monthStart = nzToday().slice(0, 7) + "-01";
    const fetchSince = new Date(Date.parse(monthStart + "T00:00:00Z") - 2 * 86_400_000);

    // Scope: admin → everyone; coach → members on their assigned teams only.
    let memberRows: { id: string }[];
    if (session.role === "admin") {
      memberRows = await d.select({ id: teamMembers.id }).from(teamMembers).where(eq(teamMembers.active, true));
    } else {
      const teamIds = (await d.select({ teamId: teamCoaches.teamId }).from(teamCoaches).where(eq(teamCoaches.coachEmail, session.email))).map((r) => r.teamId);
      if (!teamIds.length) return { count: 0, label: "still to connect with", href: "/connect" };
      memberRows = await d.select({ id: teamMembers.id }).from(teamMembers).where(inArray(teamMembers.teamId, teamIds));
    }
    if (!memberRows.length) return { count: 0, label: "still to connect with", href: session.role === "admin" ? "/connect?view=all" : "/connect" };

    const conns = await d.select({ pcoId: connections.pcoId, at: connections.contactedAt }).from(connections).where(gte(connections.contactedAt, fetchSince));
    const contacted = new Set(conns.filter((c) => nzDateOf(c.at.toISOString()) >= monthStart).map((c) => c.pcoId));
    const count = memberRows.filter((m) => !contacted.has(m.id)).length;
    return { count, label: "still to connect with", href: session.role === "admin" ? "/connect?view=all" : "/connect" };
  } catch {
    return null;
  }
}
