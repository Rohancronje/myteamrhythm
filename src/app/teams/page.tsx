import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { TeamsManager } from "@/components/TeamsManager";
import { getSession } from "@/lib/auth/server";
import { listTeams, getAllCoaches, getPcoTeams } from "@/lib/data/teams-admin";

export const dynamic = "force-dynamic";

// Admin Teams management: create teams, then add volunteers and assign coaches.
export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/connect");

  const [teams, coaches, pcoTeams] = await Promise.all([listTeams(), getAllCoaches(), getPcoTeams()]);

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-7xl">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <h1 className="mt-1.5 text-sm font-normal text-mute">Teams · volunteers &amp; coaches</h1>
        </div>
        <AccountChip />
      </header>

      <TeamsManager teams={teams} coaches={coaches} pcoTeams={pcoTeams} />

      <AppNav />
    </main>
  );
}
