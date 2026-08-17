import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountMenu } from "@/components/AccountMenu";
import { HomeScreen, type Story, type TeamCard } from "@/components/HomeScreen";
import { getTeam, getTeamInfo, getFlagged, getTeamGroups } from "@/lib/data/team";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  // Members and leaders land on their own profile, not the team-wide dashboard.
  if (session && session.role !== "admin") {
    redirect(session.personId ? `/journey/${session.personId}` : "/pulse");
  }
  const members = await getTeam();
  const info = await getTeamInfo();
  const flagged = getFlagged(members);
  const groups = getTeamGroups(members);

  const totals = {
    elevated: members.filter((m) => m.assessment.status === "elevated").length,
    watch: members.filter((m) => m.assessment.status === "watch").length,
    steady: members.filter((m) => m.assessment.status === "steady").length,
    active: members.length,
  };

  const stories: Story[] = flagged.map((m) => ({
    id: m.id,
    name: m.name,
    initials: m.initials,
    team: m.team,
    status: m.assessment.status,
    reason: m.assessment.reason,
    streakWeeks: m.assessment.streakWeeks,
    servicesThisWeek: m.assessment.servicesThisWeek,
    weeklyDots: m.assessment.weeklyDots,
  }));

  const teams: TeamCard[] = groups.map((g) => ({
    team: g.team,
    emoji: g.emoji,
    count: g.members.length,
    flagged: g.flagged,
    status: g.status,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-7 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">
            {greeting}{session ? `, ${session.name.split(" ")[0]}` : ""} · NS Family Services
          </p>
        </div>
        {session ? (
          <AccountMenu name={session.name} role={session.role} />
        ) : (
          <span
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs"
            style={{ color: info.source === "planning-center" ? "var(--color-mint)" : "var(--color-faint)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.source === "planning-center" ? "var(--color-mint)" : "var(--color-faint)" }} />
            {info.source === "planning-center" ? "Live" : "No data"}
          </span>
        )}
      </header>

      {info.source === "none" ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No roster synced yet.</p>
          <p className="mt-2 text-sm text-mute">Run the Planning Center sync to bring your team in.</p>
        </div>
      ) : (
        <HomeScreen stories={stories} teams={teams} totals={totals} />
      )}

      <AppNav />
    </div>
  );
}
