import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { NotificationBell } from "@/components/NotificationBell";
import { getSession } from "@/lib/auth/server";
import { getUserTeams } from "@/lib/auth/users";
import { getAllTeamIds } from "@/lib/data/teams-admin";
import { getHomeStats } from "@/lib/data/connect";
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
  if (!["admin", "coach", "leader", "pastor"].includes(session.role)) redirect("/login");

  const first = session.name.split(/\s+/)[0] || session.name;
  const isAdmin = session.role === "admin";
  const owner = isOwner(session.email);
  const nzNow = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Pacific/Auckland", hour: "2-digit", hourCycle: "h23" }).format(nzNow));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }).format(nzNow);
  const [events, perms] = await Promise.all([getUpcomingEvents(), getPerms(session.email, session.role)]);

  let stats: { total: number; contactedPct: number; birthdays: number; stillToReach: number } | null = null;
  if (isAdmin || session.role === "coach") {
    const teamIds = isAdmin ? await getAllTeamIds() : await getUserTeams(session.email);
    stats = await getHomeStats(teamIds, nzNowAnchor());
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-5xl">
      <header className="rise mb-6 flex items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <AccountChip />
        </div>
      </header>

      {/* Welcome */}
      <section className="rise glass-edge relative overflow-hidden rounded-[var(--radius-card)] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple/25 blur-3xl" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">{dateLabel}</p>
        <h1 className="relative mt-2 font-display text-[26px] font-bold leading-tight text-text">{greeting}, {first} 👋</h1>
        <p className="relative mt-2 max-w-md text-sm leading-relaxed text-mute text-balance">
          Thank you for showing up for your people — the messages, the prayers, the small moments no one else sees. They matter more than you know.
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
            <QuickLink href="/songs-insights" label="Songs" />
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
