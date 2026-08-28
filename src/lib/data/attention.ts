// The one number a coach or admin cares about at a glance: how many volunteers
// still need connecting with this cycle. Kept deliberately CHEAP — a couple of
// id/count queries — because it renders in the sidebar on every page. Never breaks
// a page (defensive → null on any error).

import type { SessionUser } from "@/lib/auth/session";

const CYCLE_DAYS = 28;

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
    const cutoff = new Date(Date.now() - CYCLE_DAYS * 86_400_000);

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

    const conns = await d.select({ pcoId: connections.pcoId }).from(connections).where(gte(connections.contactedAt, cutoff));
    const contacted = new Set(conns.map((c) => c.pcoId));
    const count = memberRows.filter((m) => !contacted.has(m.id)).length;
    return { count, label: "still to connect with", href: session.role === "admin" ? "/connect?view=all" : "/connect" };
  } catch {
    return null;
  }
}
