import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { getSession } from "@/lib/auth/server";
import { getUserTeams } from "@/lib/auth/users";
import { getAllTeamIds } from "@/lib/data/teams-admin";
import { getCoachConnect } from "@/lib/data/connect";
import { getUpcomingEvents } from "@/lib/data/events";
import { getPerms } from "@/lib/auth/permissions";
import { isOwner } from "@/lib/auth/owner";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { nzNowAnchor } from "@/lib/time";

export const dynamic = "force-dynamic";

// The landing dashboard — where every signed-in user (admin / coach / leader) lands.
// Welcome, what's coming up, and an at-a-glance view of their team.
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["admin", "coach", "leader"].includes(session.role)) redirect("/login");

  const first = session.name.split(/\s+/)[0] || session.name;
  const isAdmin = session.role === "admin";
  const owner = isOwner(session.email);
  const [events, perms] = await Promise.all([getUpcomingEvents(), getPerms(session.email, session.role)]);

  let stats: { total: number; contactedPct: number; birthdays: number; stillToReach: number } | null = null;
  if (isAdmin || session.role === "coach") {
    const teamIds = isAdmin ? await getAllTeamIds() : await getUserTeams(session.email);
    const data = await getCoachConnect(teamIds, nzNowAnchor(), session.email);
    stats = {
      total: data.total,
      contactedPct: data.contactedPct,
      birthdays: data.birthdaysSoon.length,
      stillToReach: data.people.filter((p) => p.due).length,
    };
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-5xl">
      <header className="rise mb-6 flex items-center justify-between">
        <Wordmark />
        <AccountChip />
      </header>

      {/* Welcome */}
      <section className="rise glass-edge relative overflow-hidden rounded-[var(--radius-card)] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple/25 blur-3xl" />
        <h1 className="relative font-display text-2xl font-bold text-text">Hi {first} 👋</h1>
        <p className="relative mt-2 text-sm leading-relaxed text-mute text-balance">
          Thank you for everything you pour into your people. The small, faithful ways you show up — a message, a prayer, remembering a birthday — add up to something far bigger than you see. Here&apos;s your snapshot for today.
        </p>
      </section>

      {/* What's coming up */}
      <UpcomingEvents events={events} canPost={perms.canPostEvents} />

      {/* Team snapshot + link to Connect */}
      {stats && (
        <section className="rise mt-7" style={{ animationDelay: "60ms" }}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-mute">Your {isAdmin ? "church" : "team"} this month</h2>
            <Link href="/connect" className="grad-text text-xs font-semibold">Open Connect →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile label={isAdmin ? "People" : "Team"} value={`${stats.total}`} />
            <Tile label="Connected" value={`${stats.contactedPct}%`} sub="this month" />
            <Tile label="Still to reach" value={`${stats.stillToReach}`} />
            <Tile label="Birthdays" value={`${stats.birthdays}`} sub="this week" />
          </div>
        </section>
      )}

      {/* Admin management shortcuts */}
      {isAdmin && (
        <section className="rise mt-7" style={{ animationDelay: "90ms" }}>
          <h2 className="mb-3 text-sm font-medium text-mute">Manage</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <QuickLink href="/teams" label="Teams" />
            <QuickLink href="/admin/coaches" label="Coaches" />
            <QuickLink href="/admin/users" label="Accounts" />
            {owner && <QuickLink href="/admin/audit" label="Audit log" />}
          </div>
        </section>
      )}

      <AppNav />
    </main>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="font-display text-3xl font-bold text-text">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-mute">{label}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="glass flex items-center justify-between rounded-2xl px-4 py-3">
      <span className="text-sm font-medium text-text">{label}</span>
      <span className="grad-text text-xs font-semibold">→</span>
    </Link>
  );
}
