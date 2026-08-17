"use client";

// The full roster as a sortable table — scannable, dense, and honest about scale
// in a way 60 identical cards never were. Click a header to sort. Pseudonymous
// handles; risk chip per row.

import { useMemo, useState } from "react";
import { RISK_META } from "@/lib/rhythm/presentation";
import type { RiskAssessment } from "@/lib/rhythm/insights";

type Key = "handle" | "team" | "acwr" | "loadDelta" | "weeksWithoutBreak" | "score";

export function RosterTable({ rows }: { rows: RiskAssessment[] }) {
  const [sort, setSort] = useState<Key>("score");
  const [dir, setDir] = useState<1 | -1>(-1);

  const sorted = useMemo(() => {
    const s = [...rows].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return (((av as number) ?? 0) - ((bv as number) ?? 0)) * dir;
    });
    return s;
  }, [rows, sort, dir]);

  function header(key: Key, label: string, align: "left" | "right" = "right") {
    const active = sort === key;
    return (
      <th
        className={`cursor-pointer select-none px-3 py-2.5 text-xs font-medium text-ink-soft ${align === "right" ? "text-right" : "text-left"}`}
        onClick={() => {
          if (active) setDir((d) => (d === 1 ? -1 : 1));
          else {
            setSort(key);
            setDir(-1);
          }
        }}
      >
        {label}
        <span className="ml-1 text-ink-faint">{active ? (dir === -1 ? "↓" : "↑") : ""}</span>
      </th>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">All active volunteers</h2>
        <p className="text-xs text-ink-faint">{rows.length} serving in the last 12 weeks · click a column to sort</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface-2">
            <tr className="border-b border-line">
              {header("handle", "Volunteer", "left")}
              {header("team", "Team", "left")}
              {header("acwr", "Load")}
              {header("loadDelta", "4-wk Δ")}
              {header("weeksWithoutBreak", "No break")}
              {header("score", "Risk", "right")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const meta = RISK_META[r.level];
              return (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-3 py-2.5 font-medium text-ink">{r.handle}</td>
                  <td className="max-w-[180px] truncate px-3 py-2.5 text-ink-soft" title={r.team}>{r.team}</td>
                  <td className="tabnum px-3 py-2.5 text-right text-ink">{r.acwr != null ? `${r.acwr.toFixed(2)}×` : "—"}</td>
                  <td className="tabnum px-3 py-2.5 text-right" style={{ color: r.loadDelta > 0.05 ? "var(--color-elevated)" : r.loadDelta < -0.05 ? "var(--color-calm)" : "var(--color-ink-faint)" }}>
                    {r.loadDelta > 0 ? "▲" : r.loadDelta < 0 ? "▼" : ""}{Math.abs(r.loadDelta).toFixed(2)}
                  </td>
                  <td className="tabnum px-3 py-2.5 text-right text-ink-soft">{r.weeksWithoutBreak}w</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold" style={{ color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
