"use client";

// The roster, as a compact analytical grid. Privacy is tangible: members show
// pseudonymously by default; only a pastoral-care lead can unlock an individual,
// and only past threshold. The role switcher is a demo affordance — in production
// it comes from auth. Cards are data-first: sparkline + numbers, not sentences.

import { useMemo, useState } from "react";
import Link from "next/link";
import { RhythmLine } from "./RhythmLine";
import { ATTENTION_META } from "@/lib/rhythm/presentation";
import { canUnlockIndividual, type ViewerRole } from "@/lib/rhythm/wellbeing";
import type { SeededPerson } from "@/lib/data/seed";

type Row = {
  id: string;
  handle: string;
  name: string;
  initials: string;
  team: string;
  role: string;
  attention: SeededPerson["signal"]["attention"];
  reasons: string[];
  acwr: number | null;
  wellbeing: number | null;
  weeksWithoutBreak: number;
  loadDelta: number;
  series: SeededPerson["rhythm"]["series"];
};

export function Roster({ rows, moverIds = [] }: { rows: Row[]; moverIds?: string[] }) {
  const [role, setRole] = useState<ViewerRole>("pastoral_care");
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const movers = new Set(moverIds);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => ATTENTION_META[b.attention].order - ATTENTION_META[a.attention].order),
    [rows],
  );

  const roles: { key: ViewerRole; label: string }[] = [
    { key: "team_member", label: "Member" },
    { key: "team_lead", label: "Lead" },
    { key: "pastoral_care", label: "Pastoral" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-cream">Everyone serving</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-cream-faint">as</span>
          <div className="flex rounded-full border border-line bg-card p-1">
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-all ${
                  role === r.key
                    ? "bg-ember text-night shadow-[0_0_18px_-2px_var(--color-ember)]"
                    : "text-cream-soft hover:text-cream"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((row, i) => {
          const meta = ATTENTION_META[row.attention];
          const signal = {
            personId: row.id,
            attention: row.attention,
            reasons: row.reasons,
            acwr: row.acwr,
            wellbeing: row.wellbeing,
            wellbeingSlope: null,
          };
          const eligible = canUnlockIndividual({ role, personId: "__viewer__" }, signal);
          const isOpen = unlocked.has(row.id);
          const revealed = eligible && isOpen;
          const gated = row.attention === "check_in" || row.attention === "priority";

          return (
            <li
              key={row.id}
              className="rise glass card-hover group relative overflow-hidden rounded-2xl p-4"
              style={{ animationDelay: `${Math.min(i * 40, 360)}ms` }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-35 blur-2xl"
                style={{ background: meta.color }}
              />

              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                    <span className="truncate font-medium text-cream">{revealed ? row.name : row.handle}</span>
                    {movers.has(row.id) && (
                      <span className="rounded bg-ember/15 px-1.5 text-[10px] font-semibold text-ember">RISING</span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${meta.color}22`, color: meta.color }}>
                  {meta.label}
                </span>
              </div>

              <div className="relative mt-2">
                <RhythmLine series={row.series} color={meta.color} width={300} height={46} showBaseline={false} />
              </div>

              {/* metric row */}
              <div className="relative mt-2 grid grid-cols-3 gap-1 border-t border-line-soft pt-2 text-center">
                <Metric
                  label="load"
                  value={row.acwr !== null ? `${row.acwr.toFixed(2)}×` : "—"}
                  delta={row.loadDelta}
                />
                <Metric label="feeling" value={row.wellbeing !== null ? row.wellbeing.toFixed(1) : "—"} />
                <Metric label="no break" value={`${row.weeksWithoutBreak}w`} />
              </div>

              {gated && (
                <div className="relative mt-2.5">
                  {eligible ? (
                    isOpen ? (
                      <Link href={`/journey/${row.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-ember hover:underline">
                        Open journey →
                      </Link>
                    ) : (
                      <button onClick={() => setUnlocked((s) => new Set(s).add(row.id))} className="inline-flex items-center gap-1.5 text-xs font-medium text-ember hover:underline">
                        <LockIcon /> Unlock
                      </button>
                    )
                  ) : (
                    <p className="text-[11px] text-cream-faint">
                      {role === "pastoral_care" ? "Below threshold." : "Pastoral care only."}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div>
      <p className="font-display text-lg leading-none text-cream">
        {value}
        {delta != null && Math.abs(delta) >= 0.05 && (
          <span className="ml-1 text-[10px]" style={{ color: delta > 0 ? "var(--color-ember)" : "var(--color-zone-steady)" }}>
            {delta > 0 ? "▲" : "▼"}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-cream-faint">{label}</p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
