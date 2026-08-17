import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Roster } from "@/components/Roster";
import { LoadFeelingMatrix } from "@/components/LoadFeelingMatrix";
import { TeamTrend } from "@/components/TeamTrend";
import { getPilotData } from "@/lib/data/seed";
import { aggregateSignals } from "@/lib/rhythm/wellbeing";
import { buildInsights } from "@/lib/rhythm/insights";

export default function Dashboard() {
  const data = getPilotData();
  const agg = aggregateSignals(data.map((d) => d.signal));
  const ins = buildInsights(data);

  const deltaByPerson = new Map(ins.matrix.map((m) => [m.id, m.loadDelta]));
  const moverIds = new Set(ins.movers.map((m) => m.id));

  const rows = data.map((d) => ({
    id: d.person.id,
    handle: d.person.handle,
    name: d.person.name,
    initials: d.person.initials,
    team: d.person.team,
    role: d.person.role,
    attention: d.signal.attention,
    reasons: d.signal.reasons,
    acwr: d.signal.acwr,
    wellbeing: d.signal.wellbeing,
    weeksWithoutBreak: d.rhythm.weeksWithoutBreak,
    loadDelta: deltaByPerson.get(d.person.id) ?? 0,
    series: d.rhythm.series,
  }));

  const loadNow = ins.loadTrend.at(-1)?.median ?? null;
  const loadPrev = ins.loadTrend.at(-5)?.median ?? null;
  const loadDelta = loadNow != null && loadPrev != null ? loadNow - loadPrev : null;
  const dangerDelta = ins.dangerNow - ins.dangerPrev;

  const kpis = [
    {
      k: "Burnout corner",
      v: `${ins.dangerNow}`,
      delta: dangerDelta,
      deltaGood: dangerDelta <= 0,
      sub: "high load · low feeling",
      accent: "var(--color-ember)",
    },
    {
      k: "Team load",
      v: loadNow?.toFixed(2) ?? "—",
      unit: "×",
      delta: loadDelta,
      deltaGood: (loadDelta ?? 0) <= 0,
      sub: "median vs 4 weeks ago",
      accent: "var(--color-gold)",
      fmt: (n: number) => n.toFixed(2),
    },
    {
      k: "Feeling down",
      v: `${Math.round(ins.fallingShare * 100)}`,
      unit: "%",
      sub: "of team trending lower",
      accent: "var(--color-zone-climbing)",
    },
    {
      k: "Reach out soon",
      v: `${agg.counts.priority}`,
      sub: "crossed the line",
      accent: "var(--color-clay)",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8">
      {/* Header */}
      <header className="rise flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div className="flex items-baseline gap-4">
          <Wordmark />
          <span className="hidden text-sm text-cream-faint sm:inline">
            NS Family Services · week of 17 Aug 2026
          </span>
        </div>
        <Link
          href="/pulse"
          className="rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-cream-soft transition-colors hover:border-ember hover:text-cream"
        >
          Open a pulse check-in →
        </Link>
      </header>

      {/* KPI strip */}
      <section className="rise mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: "60ms" }}>
        {kpis.map((s) => (
          <div key={s.k} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: s.accent, boxShadow: `0 0 10px ${s.accent}` }} />
              <p className="text-xs uppercase tracking-wide text-cream-faint">{s.k}</p>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <p className="font-display text-5xl leading-none text-cream">
                {s.v}
                {s.unit && <span className="text-xl text-cream-faint">{s.unit}</span>}
              </p>
              {s.delta != null && s.delta !== 0 && (
                <span
                  className="mb-1 text-xs font-semibold"
                  style={{ color: s.deltaGood ? "var(--color-zone-steady)" : "var(--color-ember)" }}
                >
                  {s.delta > 0 ? "▲" : "▼"}{" "}
                  {s.fmt ? s.fmt(Math.abs(s.delta)) : Math.abs(s.delta)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-cream-soft">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* Insight row: matrix + trend/movers */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rise glass rounded-[var(--radius-card)] p-5 lg:col-span-3" style={{ animationDelay: "120ms" }}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-xl text-cream">Load × feeling</h2>
            <span className="text-xs text-cream-faint">each dot = one person · hover</span>
          </div>
          <p className="mb-2 text-xs text-cream-soft">
            Neither signal alone predicts burnout. Together they do — the bottom-right corner is where it lives.
          </p>
          <LoadFeelingMatrix points={ins.matrix} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rise glass rounded-[var(--radius-card)] p-5" style={{ animationDelay: "160ms" }}>
            <h2 className="mb-2 font-display text-xl text-cream">Team load, 12 weeks</h2>
            <TeamTrend trend={ins.loadTrend} />
          </div>
          <div className="rise glass rounded-[var(--radius-card)] p-5" style={{ animationDelay: "200ms" }}>
            <h2 className="mb-3 font-display text-xl text-cream">Biggest movers</h2>
            {ins.movers.length === 0 ? (
              <p className="text-sm text-cream-soft">Load is steady across the team.</p>
            ) : (
              <ul className="space-y-2.5">
                {ins.movers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-cream-soft">{m.handle}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-display text-base text-cream">{m.acwr?.toFixed(2)}×</span>
                      <span className="text-xs font-semibold text-ember">▲ {m.delta.toFixed(2)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Roster */}
      <section className="mt-6">
        <Roster rows={rows} moverIds={[...moverIds]} />
      </section>

      <footer className="mt-12 border-t border-line pt-5 text-xs text-cream-faint">
        Aggregated and pseudonymous. Individual detail unlocks only for pastoral care, only past threshold.
      </footer>
    </main>
  );
}
