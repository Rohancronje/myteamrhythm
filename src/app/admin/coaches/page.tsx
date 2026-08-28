import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { CoachManager } from "@/components/CoachManager";
import { getSession } from "@/lib/auth/server";
import { getUserTeams } from "@/lib/auth/users";
import { getCoachConnect } from "@/lib/data/connect";
import { getCoachCandidates } from "@/lib/data/teams-admin";
import { nzNowAnchor } from "@/lib/time";

export const dynamic = "force-dynamic";

async function loadCoaches() {
  if (!process.env.DATABASE_URL) return [];
  const { getDb } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await getDb().select().from(users).where(eq(users.role, "coach"));
  const now = nzNowAnchor();
  return Promise.all(
    rows.map(async (u) => {
      const teamIds = await getUserTeams(u.email);
      const c = await getCoachConnect(teamIds, now);
      return { email: u.email, name: u.name, phone: u.phone ?? null, teams: c.teams, total: c.total, contactedPct: c.contactedPct };
    }),
  );
}

export default async function CoachesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/connect");

  const [coaches, candidates] = await Promise.all([loadCoaches(), getCoachCandidates()]);

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/connect" className="text-sm text-mute transition-colors hover:text-text">← Connect</Link>
        <Wordmark />
        <AccountChip />
      </header>

      <h1 className="rise mb-1 font-display text-2xl font-bold text-text">Coaches</h1>
      <p className="rise mb-6 text-sm text-mute">Assign a coach to a team. They&apos;ll see only their people and their connect plan.</p>

      <CoachManager coaches={coaches} candidates={candidates} />

      <AppNav />
    </div>
  );
}
