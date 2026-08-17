import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { getTeamGroups } from "@/lib/data/team";
import { STATUS_META } from "@/lib/rhythm/status";

export const dynamic = "force-dynamic";

// Team-first view (handover: rhythm_by_team). Teams ordered by concern; flagged
// members listed underneath with their plain-language reason. Steady members stay
// collapsed to a count — never the same visual weight as a flagged one.

export default function TeamsPage() {
  const groups = getTeamGroups();

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">Teams · by concern</p>
        </div>
      </header>

      <div className="space-y-4">
        {groups.map((g, gi) => {
          const meta = STATUS_META[g.status];
          const flagged = g.members
            .filter((m) => m.assessment.status !== "steady")
            .sort((a, b) => (b.assessment.status === "elevated" ? 1 : 0) - (a.assessment.status === "elevated" ? 1 : 0));
          const steady = g.members.length - flagged.length;
          return (
            <section key={g.team} className="rise glass overflow-hidden rounded-[var(--radius-card)]" style={{ animationDelay: `${gi * 40}ms` }}>
              <span className="block h-1 w-full" style={{ background: meta.ring }} />
              <div className="p-5">
                <Link href={`/teams/${encodeURIComponent(g.team)}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{g.emoji}</span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-text">{g.team}</h2>
                      <p className="text-xs text-mute">{g.members.length} serving · tap to open</p>
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: meta.color, background: meta.soft }}>
                    {g.flagged > 0 ? `${g.flagged} to check` : "All steady"}
                  </span>
                </Link>

                {flagged.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {flagged.map((m) => {
                      const mm = STATUS_META[m.assessment.status];
                      return (
                        <li key={m.id}>
                          <Link href={`/journey/${m.id}`} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-border-strong">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: mm.color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-text">{m.name}</span>
                              <span className="block truncate text-xs text-mute">{m.assessment.reason}</span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold" style={{ color: mm.color }}>{mm.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {steady > 0 && (
                  <p className="mt-3 text-xs text-faint">
                    {flagged.length > 0 ? "+ " : ""}{steady} {steady === 1 ? "person is" : "others are"} serving steady.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AppNav />
    </div>
  );
}
