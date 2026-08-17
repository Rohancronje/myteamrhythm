import { Wordmark } from "@/components/Wordmark";
import { BottomNav } from "@/components/BottomNav";
import { getTeam, getTeamInfo } from "@/lib/data/team";

export const dynamic = "force-dynamic";

// Insights — plain-language rollups only. The pulse word cloud stays an honest
// empty state until check-ins begin (handover: never fabricate mood data).

export default function InsightsPage() {
  const members = getTeam();
  const info = getTeamInfo();
  const elevated = members.filter((m) => m.assessment.status === "elevated").length;
  const watch = members.filter((m) => m.assessment.status === "watch").length;
  const steady = members.filter((m) => m.assessment.status === "steady").length;
  const longStreaks = members.filter((m) => m.assessment.streakWeeks >= 12).length;

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6">
        <Wordmark />
        <p className="mt-1.5 text-sm text-mute">Insights · {info.org}</p>
      </header>

      <section className="rise glass rounded-[var(--radius-card)] p-6">
        <p className="text-lg leading-relaxed text-text text-balance">
          Of <span className="font-display font-bold">{members.length}</span> volunteers serving now,{" "}
          <span className="font-display font-bold text-pink">{elevated}</span> are serving heavy and{" "}
          <span className="font-display font-bold text-amber">{watch}</span> are worth watching.{" "}
          <span className="text-mute">{steady} are in a healthy rhythm.</span>
        </p>
      </section>

      <section className="rise mt-4 grid grid-cols-2 gap-3" style={{ animationDelay: "60ms" }}>
        <Tile value={longStreaks} label="on a 12+ week streak with no break" />
        <Tile value={elevated + watch} label="flagged for a check-in this week" />
      </section>

      <section className="rise mt-4 glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "100ms" }}>
        <h2 className="text-sm font-medium text-text">How the team is feeling</h2>
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong py-10 text-center">
          <p className="font-display text-lg text-text">No check-ins logged yet.</p>
          <p className="mt-2 max-w-xs text-sm text-mute text-balance">
            Once volunteers start the post-service pulse, their one-word answers build an anonymous word cloud here.
          </p>
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="font-display text-4xl font-bold text-text">{value}</p>
      <p className="mt-2 text-sm text-mute text-balance">{label}</p>
    </div>
  );
}
