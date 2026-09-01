import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { SongInsightsView } from "@/components/SongInsightsView";
import { getSession } from "@/lib/auth/server";
import { getSongInsights } from "@/lib/data/song-insights";
import { isWorshipCoach } from "@/lib/data/teams-admin";

export const dynamic = "force-dynamic";

// Songs Insights — the NS Worship Team's setlist patterns over a rolling window.
// Visible to admins and to coaches assigned to a worship team.
export default async function SongsInsightsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && !(session.role === "coach" && (await isWorshipCoach(session.email)))) {
    redirect("/connect");
  }

  const data = await getSongInsights();

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-5xl">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">Songs Insights · NS Worship Team</p>
        </div>
        <AccountChip />
      </header>

      {data.sixMonths.sets === 0 && data.twelveMonths.sets === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No song history yet.</p>
          <p className="mt-2 text-sm text-mute">Once setlists sync from Planning Center, insights will appear here.</p>
        </div>
      ) : (
        <SongInsightsView data={data} />
      )}

      <AppNav />
    </main>
  );
}
