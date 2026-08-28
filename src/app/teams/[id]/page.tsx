import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { TeamEditor } from "@/components/TeamEditor";
import { getSession } from "@/lib/auth/server";
import { getTeamById, getAllCoaches } from "@/lib/data/teams-admin";

export const dynamic = "force-dynamic";

// Manage one team: its volunteers (add/import/edit/remove) and assigned coaches.
export default async function TeamManagePage({ params }: PageProps<"/teams/[id]">) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/connect");

  const { id } = await params;
  const [team, coaches] = await Promise.all([getTeamById(id), getAllCoaches()]);
  if (!team) notFound();

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-6xl">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/teams" className="text-sm text-mute transition-colors hover:text-text">← Teams</Link>
        <Wordmark />
        <AccountChip />
      </header>

      <TeamEditor team={team} allCoaches={coaches} />

      <AppNav />
    </main>
  );
}
