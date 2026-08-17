import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Roster } from "@/components/Roster";
import { LoadFeelingMatrix } from "@/components/LoadFeelingMatrix";
import { TeamTrend } from "@/components/TeamTrend";
import { getTeamData, getDataSourceInfo, isRecentlyActive } from "@/lib/data/source";
import { buildInsights, buildCohorts, buildForecast } from "@/lib/rhythm/insights";

export const dynamic = "force-dynamic";

const ROSTER_CAP = 60;

function acwrAgo(series: { acwr: number | null }[], back: number): number | null {
  return series[series.length - 1 - back]?.acwr ?? null;
}

export default function Dashboard() {
  const data = getTeamData();
  const info = getDataSourceInfo();
  // Headline load metrics focus on volunteers serving right now; the roster keeps
  // everyone active in the window (resting people still have a journey).
  const active = data.filter((d) => isRecentlyActive(d));
  const ins = buildInsights(data);
  const cohorts = buildCohorts(active);
  const forecast = buildForecast(active);
  const hasFeeling = info.hasFeeling && ins.matrix.length > 0;

  const climbing = active.filter(
    (d) => d.rhythm.zone === "climbing" || d.rhythm.zone === "spiking",
  ).length;
  const activeAcwrs = active
    .map((d) => d.signal.acwr)
    .filter((x): x is number => x != null)
    .sort((a, b) => a - b);
  const medianActiveLoad = activeAcwrs.length
    ? activeAcwrs[Math.floor(activeAcwrs.length / 2)]
    : null;

  const rows = data.map((d) => {
    const now = d.signal.acwr;
    const past = acwrAgo(d.rhythm.series, 4);
    return {
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
      loadDelta: now != null && past != null ? now - past : 0,
      series: d.rhythm.series,
    };
  });
  const topRows = [...rows].sort((a, b) => (b.acwr ?? 0) - (a.acwr ?? 0)).slice(0, ROSTER_CAP);
  const moverIds = ins.movers.map((m) => m.id);

  const loadNow = ins.loadTrend.at(-1)?.median ?? null;
  const loadPrev = ins.loadTrend.at(-5)?.median ?? null;
  const loadDelta = loadNow != null && loadPrev != null ? loadNow - loadPrev : null;

  const kpis = [
    {
      k: "Serving now",
      v: `${active.length}`,
      sub: `of ${info.people} in the window`,
      accent: "var(--color-teal)",
    },
    {
      k: "Load, those serving",
      v: (medianActiveLoad ?? loadNow)?.toFixed(2) ?? "—",
      unit: "×",
      delta: loadDelta,
      deltaGood: (loadDelta ?? 0) <= 0,
      sub: "median vs 4 weeks ago",
      accent: "var(--color-gold)",
      fmt: (n: number) => n.toFixed(2),
    },
    {
      k: "Climbing +",
      v: `${climbing}`,
      sub: "serving above baseline",
      accent: "var(--color-zone-climbing)",
    },
    hasFeeling
      ? {
          k: "Burnout corner",
          v: `${ins.dangerNow}`,
          delta: ins.dangerNow - ins.dangerPrev,
          deltaGood: ins.dangerNow - ins.dangerPrev <= 0,
          sub: "high load · low feeling",
          accent: "var(--color-ember)",
        }
      : {
          k: "On the rise",
          v: `${ins.movers.length}`,
          sub: "load climbing fast",
          accent: "var(--color-ember)",
        },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8">
      {/* Header */}
      <header className="rise flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <div className="flex items-baseline gap-4">
          <Wordmark />
          <span className="hidden text-sm text-cream-faint sm:inline">
            NS Family Services · 26-week window
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs"
            style={{ color: info.source === "planning-center" ? "var(--color-zone-steady)" : "var(--color-cream-faint)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: info.source === "planning-center" ? "var(--color-zone-steady)" : "var(--color-cream-faint)",
                boxShadow: info.source === "planning-center" ? "0 0 8px var(--color-zone-steady)" : undefined,
              }}
            />
            {info.source === "planning-center" ? "Live · Planning Center" : "Sample data"}
          </span>
          <Link
            href="/pulse"
            className="rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-cream-soft transition-colors hover:border-ember hover:text-cream"
          >
            Pulse check-in →
          </Link>
        </div>
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
                {"unit" in s && s.unit && <span className="text-xl text-cream-faint">{s.unit}</span>}
              </p>
              {"delta" in s && s.delta != null && s.delta !== 0 && (
                <span
                  className="mb-1 text-xs font-semibold"
                  style={{ color: s.deltaGood ? "var(--color-zone-steady)" : "var(--color-ember)" }}
                >
                  {s.delta > 0 ? "▲" : "▼"} {"fmt" in s && s.fmt ? s.fmt(Math.abs(s.delta)) : Math.abs(s.delta)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-cream-soft">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* Insight row */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rise glass rounded-[var(--radius-card)] p-5 lg:col-span-3" style={{ animationDelay: "120ms" }}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-xl text-cream">Load × feeling</h2>
            <span className="text-xs text-cream-faint">each dot = one person</span>
          </div>
          {hasFeeling ? (
            <>
              <p className="mb-2 text-xs text-cream-soft">
                Neither signal alone predicts burnout. Together they do — the bottom-right corner is where it lives.
              </p>
              <LoadFeelingMatrix points={ins.matrix} />
            </>
          ) : (
            <div className="relative mt-2 flex h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-line text-center">
              <div
                className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full opacity-20 blur-3xl"
                style={{ background: "var(--color-ember)" }}
              />
              <p className="font-display text-2xl text-cream">Half the picture is here.</p>
              <p className="mt-2 max-w-sm text-sm text-cream-soft">
                Load is live from Planning Center. Feeling lights up this view once
                volunteers start tapping the post-service pulse.
              </p>
              <Link
                href="/pulse"
                className="mt-4 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-night transition-all hover:shadow-[0_0_30px_-8px_var(--color-ember)]"
              >
                Preview the check-in →
              </Link>
            </div>
          )}
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

      {/* Analytics: cohorts + forecast */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rise glass rounded-[var(--radius-card)] p-5 lg:col-span-3" style={{ animationDelay: "160ms" }}>
          <h2 className="mb-3 font-display text-xl text-cream">Load by team</h2>
          <div className="space-y-2.5">
            {cohorts.slice(0, 8).map((c) => {
              const pct = Math.min(100, ((c.medianAcwr ?? 0) / 1.6) * 100);
              const hot = (c.medianAcwr ?? 0) >= 1.3;
              return (
                <div key={c.team} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm text-cream-soft" title={c.team}>
                    {c.team}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-night ring-1 ring-line">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: hot ? "var(--color-ember)" : "var(--color-gold)",
                        boxShadow: `inset 0 0 12px ${hot ? "var(--color-ember)" : "var(--color-gold)"}`,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-display text-sm text-cream">
                    {c.medianAcwr?.toFixed(2) ?? "—"}×
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs text-cream-faint">{c.size}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rise glass rounded-[var(--radius-card)] p-5 lg:col-span-2" style={{ animationDelay: "200ms" }}>
          <h2 className="font-display text-xl text-cream">Forecast · 2 weeks</h2>
          <p className="mt-1 text-xs text-cream-soft">If current trajectories hold.</p>
          <p className="mt-4 font-display text-6xl leading-none text-cream">
            {forecast.projectedSpiking.length}
          </p>
          <p className="mt-1 text-sm text-cream-soft">
            projected to cross the 1.5× spike line
          </p>
          {forecast.projectedSpiking.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-line-soft pt-3">
              {forecast.projectedSpiking.slice(0, 4).map((f) => (
                <li key={f.id} className="flex items-center justify-between text-sm">
                  <span className="text-cream-soft">{f.handle}</span>
                  <span className="text-cream-faint">
                    {f.current.toFixed(2)} <span className="text-ember">→ {f.projected.toFixed(2)}×</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Roster */}
      <section className="mt-8">
        <Roster rows={topRows} moverIds={moverIds} />
        {rows.length > topRows.length && (
          <p className="mt-4 text-center text-sm text-cream-faint">
            Showing the {topRows.length} highest-load volunteers of {rows.length} active.
          </p>
        )}
      </section>

      <footer className="mt-12 border-t border-line pt-5 text-xs text-cream-faint">
        Aggregated and pseudonymous. Individual detail unlocks only for pastoral care, only past threshold.
      </footer>
    </main>
  );
}
