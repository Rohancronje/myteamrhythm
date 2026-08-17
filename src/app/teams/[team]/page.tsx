import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { DotCalendar } from "@/components/DotCalendar";
import { getTeamGroupByName } from "@/lib/data/team";
import { STATUS_META } from "@/lib/rhythm/status";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({ params }: PageProps<"/teams/[team]">) {
  const { team } = await params;
  const name = decodeURIComponent(team);
  const g = await getTeamGroupByName(name);
  if (!g) notFound();

  const meta = STATUS_META[g.status];
  const flagged = g.members
    .filter((m) => m.assessment.status !== "steady")
    .sort((a, b) => (b.assessment.status === "elevated" ? 1 : 0) - (a.assessment.status === "elevated" ? 1 : 0));
  const steady = g.members.filter((m) => m.assessment.status === "steady");

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/teams" className="text-sm text-mute transition-colors hover:text-text">← Teams</Link>
        <Wordmark />
      </header>

      <section className="rise glass overflow-hidden rounded-[var(--radius-card)]">
        <span className="block h-1 w-full" style={{ background: meta.ring }} />
        <div className="flex items-center gap-4 p-6">
          <span className="text-4xl">{g.emoji}</span>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-text">{g.team}</h1>
            <p className="text-sm text-mute">{g.members.length} serving · {g.flagged} to check</p>
          </div>
        </div>
      </section>

      {flagged.length > 0 && (
        <section className="mt-6">
          <h2 className="rise mb-3 text-sm font-medium text-mute">Worth a check-in</h2>
          <ul className="space-y-3">
            {flagged.map((m, i) => {
              const mm = STATUS_META[m.assessment.status];
              return (
                <li key={m.id} className="rise glass rounded-2xl p-4" style={{ animationDelay: `${i * 40}ms` }}>
                  <Link href={`/journey/${m.id}`} className="block">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full p-[2px]" style={{ background: mm.ring }}>
                          <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-xs font-semibold">{m.initials}</span>
                        </span>
                        <div>
                          <p className="font-display text-sm font-semibold text-text">{m.name}</p>
                          <p className="text-xs text-mute">{m.role}</p>
                        </div>
                      </div>
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: mm.color, background: mm.soft }}>{mm.label}</span>
                    </div>
                    <p className="mt-3 text-sm text-text">{m.assessment.reason}.</p>
                    <div className="mt-3">
                      <DotCalendar weeks={m.assessment.weeklyDots} color={mm.color} size={8} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {steady.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-mute">Serving steady</h2>
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-wrap gap-2">
              {steady.map((m) => (
                <span key={m.id} className="rounded-full border border-border px-3 py-1.5 text-xs text-mute">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <AppNav />
    </div>
  );
}
