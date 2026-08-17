"use client";

// The hero of the dashboard: WHO needs attention and WHY. A ranked list of the
// highest-risk volunteers with their specific factors spelled out as chips — the
// direct answer to "what about my team's risk". Pseudonymous until a pastoral
// lead unlocks (role switcher is a demo stand-in for auth).

import { useState } from "react";
import Link from "next/link";
import { RhythmLine } from "./RhythmLine";
import { RISK_META } from "@/lib/rhythm/presentation";
import type { RiskAssessment } from "@/lib/rhythm/insights";
import type { ViewerRole } from "@/lib/rhythm/wellbeing";

export function AttentionList({ items }: { items: RiskAssessment[] }) {
  const [role, setRole] = useState<ViewerRole>("pastoral_care");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const roles: { key: ViewerRole; label: string }[] = [
    { key: "team_member", label: "Member" },
    { key: "team_lead", label: "Lead" },
    { key: "pastoral_care", label: "Pastoral" },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Needs attention</h2>
          <p className="text-xs text-ink-faint">{items.length} volunteers flagged · highest first</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-faint">as</span>
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  role === r.key ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-soft">
          No one is flagged right now. The team is serving in a sustainable rhythm.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((r) => {
            const meta = RISK_META[r.level];
            const canUnlock = role === "pastoral_care" && (r.level === "high" || r.level === "elevated");
            const isOpen = open.has(r.id);
            const named = canUnlock && isOpen;
            return (
              <li key={r.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                {/* risk level rail */}
                <span
                  className="flex h-9 w-1.5 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                  title={meta.label}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">{named ? r.name : r.handle}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: meta.color, background: meta.bg }}
                    >
                      {meta.label}
                    </span>
                    <span className="hidden text-xs text-ink-faint sm:inline">{r.team}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {r.factors.map((f) => (
                      <span
                        key={f.key}
                        className="rounded-md border px-1.5 py-0.5 text-[11px]"
                        style={{
                          borderColor: "var(--color-line)",
                          color: f.severity === 3 ? "var(--color-high)" : f.severity === 2 ? "var(--color-elevated)" : "var(--color-ink-soft)",
                        }}
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="hidden shrink-0 sm:block">
                  <RhythmLine series={r.series} color={meta.color} width={120} height={34} showBaseline={false} />
                </div>

                <div className="w-24 shrink-0 text-right">
                  {canUnlock ? (
                    isOpen ? (
                      <Link href={`/journey/${r.id}`} className="text-xs font-medium text-brand hover:underline">
                        Open →
                      </Link>
                    ) : (
                      <button
                        onClick={() => setOpen((s) => new Set(s).add(r.id))}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Unlock
                      </button>
                    )
                  ) : (
                    <span className="text-[11px] text-ink-faint">
                      {role === "pastoral_care" ? "—" : "pastoral only"}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
