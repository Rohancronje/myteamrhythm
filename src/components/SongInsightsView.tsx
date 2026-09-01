"use client";

// Songs Insights for the NS Worship Team: most-sung songs, each leader's signature
// (go-to) song, and the most common keys — over a rolling 6- or 12-month window.

import { useState } from "react";
import type { SongInsights } from "@/lib/data/song-insights";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export function SongInsightsView({ data }: { data: SongInsights }) {
  const [months, setMonths] = useState<6 | 12>(6);
  const w = months === 6 ? data.sixMonths : data.twelveMonths;
  const maxSong = w.topSongs[0]?.count ?? 1;
  const maxKey = w.topKeys[0]?.count ?? 1;

  return (
    <div className="space-y-7">
      {/* Rolling-window toggle */}
      <div className="rise flex gap-2 rounded-full border border-border bg-surface-solid p-1 lg:max-w-xs">
        <button onClick={() => setMonths(6)} className="flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors" style={months === 6 ? { background: "var(--grad-brand)", color: "white" } : { color: "var(--color-mute)" }}>6 months</button>
        <button onClick={() => setMonths(12)} className="flex-1 rounded-full py-2 text-center text-sm font-semibold transition-colors" style={months === 12 ? { background: "var(--grad-brand)", color: "white" } : { color: "var(--color-mute)" }}>12 months</button>
      </div>

      {/* Summary */}
      <section className="rise grid grid-cols-3 gap-3" style={{ animationDelay: "30ms" }}>
        <Tile label="Setlists" value={w.sets} />
        <Tile label="Songs" value={w.distinctSongs} />
        <Tile label="Leaders" value={w.signatures.length} />
      </section>
      {data.earliest && (
        <p className="-mt-4 text-[11px] text-faint">History held from {fmtDate(data.earliest)}.{months === 12 ? " (Showing everything within 12 months.)" : ""}</p>
      )}

      {/* Most-sung songs */}
      <section className="rise" style={{ animationDelay: "60ms" }}>
        <h2 className="mb-3 text-sm font-medium text-mute">Most-sung songs</h2>
        {w.topSongs.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {w.topSongs.map((s, i) => (
              <div key={s.title} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="w-5 shrink-0 text-right font-display text-sm font-bold text-faint">{i + 1}</span>
                    <span className="truncate text-sm font-semibold text-text">{s.title}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-mute">{s.count}×</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full grad-brand" style={{ width: `${Math.max(6, Math.round((s.count / maxSong) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Signature songs per leader */}
      <section className="rise" style={{ animationDelay: "90ms" }}>
        <h2 className="mb-1 text-sm font-medium text-mute">Worship leaders&apos; signature song</h2>
        <p className="mb-3 text-xs text-faint">Each leader&apos;s go-to — the song they&apos;ve led most in this window.</p>
        {w.signatures.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {w.signatures.map((s) => (
              <div key={s.leader} className="glass rounded-2xl p-4">
                <p className="text-sm font-bold text-text">{s.leader}</p>
                <p className="mt-1 truncate font-semibold grad-text">🎵 {s.song}</p>
                <p className="mt-1 text-[11px] text-mute">led {s.timesLed}× · {s.sets} {s.sets === 1 ? "set" : "sets"} in this window</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Most common keys */}
      <section className="rise" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-3 text-sm font-medium text-mute">Most common keys</h2>
        {w.topKeys.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-wrap gap-2">
            {w.topKeys.map((k) => (
              <span key={k.key} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-solid px-3.5 py-2" style={{ borderColor: k.count === maxKey ? "rgba(139,108,255,0.5)" : undefined }}>
                <span className="font-display text-base font-bold text-text">{k.key}</span>
                <span className="text-[11px] text-mute">{k.count}×</span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <p className="font-display text-3xl font-bold text-text">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-mute">{label}</p>
    </div>
  );
}

function Empty() {
  return <p className="glass rounded-xl p-4 text-sm text-mute">Nothing in this window yet.</p>;
}
