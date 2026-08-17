import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { AttentionList } from "@/components/AttentionList";
import { RosterTable } from "@/components/RosterTable";
import { TeamTrend } from "@/components/TeamTrend";
import { getTeamData, getDataSourceInfo, isRecentlyActive } from "@/lib/data/source";
import { buildInsights, buildForecast, buildCohorts, assessTeam } from "@/lib/rhythm/insights";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const data = getTeamData();
  const info = getDataSourceInfo();
  const active = data.filter((d) => isRecentlyActive(d));

  const risk = assessTeam(active);
  const ins = buildInsights(data);
  const forecast = buildForecast(active);
  const cohorts = buildCohorts(active);

  const activeAcwrs = active
    .map((d) => d.rhythm.currentAcwr)
    .filter((x): x is number => x != null)
    .sort((a, b) => a - b);
  const loadNow = activeAcwrs.length ? activeAcwrs[Math.floor(activeAcwrs.length / 2)] : null;
  const trendNow = ins.loadTrend.filter((t) => t.median != null).at(-1)?.median ?? null;
  const trendPrev = ins.loadTrend.filter((t) => t.median != null).at(-5)?.median ?? null;
  const loadDelta = trendNow != null && trendPrev != null ? trendNow - trendPrev : null;

  const summary = [
    { k: "Need attention", v: risk.atRisk.length, tone: risk.atRisk.length ? "var(--color-elevated)" : "var(--color-calm)", sub: `${risk.counts.high} high · ${risk.counts.elevated} elevated` },
    { k: "No recent break", v: risk.factorTally.nobreak, tone: "var(--color-watch)", sub: "6+ weeks serving straight" },
    { k: "Rising fast", v: risk.factorTally.rising, tone: "var(--color-elevated)", sub: "load climbing week-on-week" },
    { k: "Projected to spike", v: forecast.projectedSpiking.length, tone: "var(--color-high)", sub: "cross 1.5× within 2 weeks" },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8">
      {/* Header */}
      <header className="rise flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden h-4 w-px bg-line sm:block" />
          <span className="hidden text-sm text-ink-soft sm:inline">NS Family Services</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium"
            style={{ color: info.source === "planning-center" ? "var(--color-calm)" : "var(--color-ink-faint)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.source === "planning-center" ? "var(--color-calm)" : "var(--color-ink-faint)" }} />
            {info.source === "planning-center" ? "Live · Planning Center" : "Sample data"}
          </span>
          <Link href="/pulse" className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90">
            Pulse check-in →
          </Link>
        </div>
      </header>

      {/* Title + context */}
      <div className="rise mb-6" style={{ animationDelay: "40ms" }}>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">Team risk, this week</h1>
        <p className="mt-1.5 text-ink-soft">
          {active.length} of {info.people} volunteers serving now · load median {loadNow?.toFixed(2) ?? "—"}×
          {loadDelta != null && (
            <span style={{ color: loadDelta > 0 ? "var(--color-elevated)" : "var(--color-calm)" }}>
              {" "}({loadDelta > 0 ? "▲" : "▼"}{Math.abs(loadDelta).toFixed(2)} vs 4 wks ago)
            </span>
          )}
        </p>
      </div>

      {/* Risk summary */}
      <section className="rise grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: "80ms" }}>
        {summary.map((s) => (
          <div key={s.k} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{s.k}</p>
              <span className="h-2 w-2 rounded-full" style={{ background: s.tone }} />
            </div>
            <p className="mt-2 font-display text-4xl leading-none text-ink tabnum">{s.v}</p>
            <p className="mt-1.5 text-xs text-ink-soft">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* Needs attention — the hero */}
      <section className="rise mt-4" style={{ animationDelay: "120ms" }}>
        <AttentionList items={risk.atRisk.slice(0, 12)} />
      </section>

      {/* Supporting analytics */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rise card p-5" style={{ animationDelay: "160ms" }}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Team load trend</h2>
            <span className="text-xs text-ink-faint">median of those serving · 12 wks</span>
          </div>
          <TeamTrend trend={ins.loadTrend} />
        </div>

        <div className="rise card p-5" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-3 text-base font-semibold text-ink">Load by team</h2>
          <div className="space-y-2">
            {cohorts.slice(0, 6).map((c) => {
              const pct = Math.min(100, ((c.medianAcwr ?? 0) / 1.6) * 100);
              const hot = (c.medianAcwr ?? 0) >= 1.3;
              return (
                <div key={c.team} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-ink-soft" title={c.team}>{c.team}</span>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hot ? "var(--color-high)" : "var(--color-elevated)" }} />
                  </div>
                  <span className="tabnum w-12 shrink-0 text-right text-sm text-ink">{c.medianAcwr?.toFixed(2) ?? "—"}×</span>
                  <span className="w-8 shrink-0 text-right text-xs text-ink-faint">{c.size}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feeling gap callout */}
      {!info.hasFeeling && (
        <section className="rise mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-5" style={{ animationDelay: "220ms" }}>
          <div>
            <h3 className="font-medium text-ink">This is the load half of the picture.</h3>
            <p className="mt-0.5 text-sm text-ink-soft text-balance">
              Load flags who <em>could</em> be overloaded. Pulse check-ins confirm who actually
              <em> feels</em> it — turning a guess into a real leading indicator.
            </p>
          </div>
          <Link href="/pulse" className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Preview the check-in →
          </Link>
        </section>
      )}

      {/* Full roster table */}
      <section className="rise mt-4" style={{ animationDelay: "240ms" }}>
        <RosterTable rows={risk.all} />
      </section>

      <footer className="mt-10 border-t border-line pt-5 text-xs text-ink-faint">
        Aggregated and pseudonymous. Individual identity unlocks only for pastoral care, only past threshold.
        Load is live from Planning Center; feeling from voluntary post-service check-ins.
      </footer>
    </main>
  );
}
