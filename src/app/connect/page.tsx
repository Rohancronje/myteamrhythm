import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { ConnectDashboard } from "@/components/ConnectDashboard";
import { getSession } from "@/lib/auth/server";
import { getUserTeams } from "@/lib/auth/users";
import { getCoachConnect } from "@/lib/data/connect";
import { getAllTeamIds } from "@/lib/data/teams-admin";
import { nzNowAnchor } from "@/lib/time";

export const dynamic = "force-dynamic";

// The connect workspace. Coaches see their team(s). Admins default to their own
// assigned team, with an "All people" tab (whole church) since they oversee it.
export default async function ConnectPage({ searchParams }: PageProps<"/connect">) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "coach" && session.role !== "admin") redirect("/");

  const isAdmin = session.role === "admin";
  const myTeams = await getUserTeams(session.email);
  const { view } = await searchParams;
  const showAll = isAdmin && (view === "all" || myTeams.length === 0);

  const teamIds = showAll ? await getAllTeamIds() : myTeams;
  const data = await getCoachConnect(teamIds, nzNowAnchor(), session.email);
  const hasTabs = isAdmin && myTeams.length > 0;

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-7xl">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">
            {showAll ? "Connect · whole church" : `Connect · ${data.teams.join(" · ") || "no team assigned"}`}
          </p>
        </div>
        <AccountChip />
      </header>

      {isAdmin && (
        <div className="rise mb-4 grid grid-cols-2 gap-3 lg:max-w-2xl">
          <Link href="/admin/coaches" className="flex flex-col justify-between rounded-2xl border border-border bg-surface-solid px-4 py-3">
            <span className="text-sm font-medium text-text">Manage coaches</span>
            <span className="grad-text mt-1 text-xs font-semibold">Open →</span>
          </Link>
          <Link href="/admin/users" className="flex flex-col justify-between rounded-2xl border border-border bg-surface-solid px-4 py-3">
            <span className="text-sm font-medium text-text">Accounts &amp; passwords</span>
            <span className="grad-text mt-1 text-xs font-semibold">Open →</span>
          </Link>
        </div>
      )}

      {/* My team / All people tabs (admins with an assigned team) */}
      {hasTabs && (
        <div className="rise mb-5 flex gap-2 rounded-full border border-border bg-surface-solid p-1 lg:max-w-sm">
          <Tab href="/connect" label="My team" active={!showAll} />
          <Tab href="/connect?view=all" label="All people" active={showAll} />
        </div>
      )}

      {data.total === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No team to connect with yet.</p>
          <p className="mt-2 text-sm text-mute">
            {session.role === "coach"
              ? "You haven't been assigned a team yet — ask your admin to set it up."
              : "Assign yourself a team in Manage coaches, or use All people."}
          </p>
        </div>
      ) : (
        <ConnectDashboard data={data} />
      )}

      <AppNav />
    </main>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors"
      style={active ? { background: "var(--grad-brand)", color: "white" } : { color: "var(--color-mute)" }}
    >
      {label}
    </Link>
  );
}
