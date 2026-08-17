import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { getSongIntel } from "@/lib/data/songs";

export const dynamic = "force-dynamic";

// Song Intelligence (handover Part B) — rotation health, key/tempo library, and
// worship-leader → song/key correlation, live from the Services API setlists.

export default async function SongsPage() {
  const intel = await getSongIntel();

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-7 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">Song Intelligence</p>
        </div>
        <AccountChip />
      </header>

      {!intel ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No setlists synced yet.</p>
          <p className="mt-2 text-sm text-mute">Run the song sync to bring your worship data in.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Briefing */}
          <section className="rise glass relative overflow-hidden rounded-[var(--radius-card)] p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple/25 blur-3xl" />
            <p className="relative mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">This season · {intel.totalServices} services</p>
            <p className="relative text-[22px] font-medium leading-[1.4] tracking-tight text-text text-balance">
              Your team has drawn on <span className="font-display font-bold grad-text">{intel.distinctSongs} songs</span> —{" "}
              <span className="font-display font-bold text-mint">{intel.inRotation}</span> are in active rotation, and{" "}
              <span className="font-display font-bold text-amber">{intel.dormant.length}</span> favourites have been resting.
            </p>
          </section>

          {/* Overview tiles */}
          <section className="rise grid grid-cols-2 gap-3" style={{ animationDelay: "70ms" }}>
            <Tile value={`${intel.avgPerSet}`} label="songs per service" />
            <Tile value={`${intel.leaders.length}`} label="worship leaders" />
          </section>

          {/* Worship leaders */}
          <section className="rise" style={{ animationDelay: "110ms" }}>
            <h2 className="mb-3.5 text-sm font-medium text-mute">Worship leaders</h2>
            <div className="no-scrollbar -mx-5 flex gap-3.5 overflow-x-auto px-5 pb-1">
              {intel.leaders.slice(0, 8).map((l) => (
                <div key={l.name} className="glass w-60 shrink-0 rounded-2xl p-5">
                  <p className="font-display text-base font-bold text-text">{l.name}</p>
                  <p className="mt-0.5 text-xs text-mute">Led {l.timesLed} · home {l.homeTurf}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {l.topKeys.map((k) => (
                      <span key={k} className="rounded-md bg-surface-2 px-2 py-0.5 font-display text-xs font-bold text-blue">{k}</span>
                    ))}
                  </div>
                  {l.signatureSongs[0] && (
                    <p className="mt-3 text-xs text-mute text-balance">
                      <span className="text-faint">Signature</span> · {l.signatureSongs[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* In rotation */}
          <section className="rise" style={{ animationDelay: "150ms" }}>
            <h2 className="mb-3.5 text-sm font-medium text-mute">In rotation</h2>
            <div className="glass overflow-hidden rounded-[var(--radius-card)]">
              <ul className="divide-y divide-border">
                {intel.mostSung.slice(0, 8).map((s, i) => (
                  <li key={s.title} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">{s.title}</span>
                      {s.author && <span className="block truncate text-xs text-faint">{s.author}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-display text-xs font-bold text-blue">{s.primaryKey}</span>
                      {s.avgBpm && <span className="text-xs text-faint">{s.avgBpm}bpm</span>}
                      <span className="w-8 text-right font-display text-sm font-bold text-text">{s.timesPlayed}×</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Resting / dormant */}
          {intel.dormant.length > 0 && (
            <section className="rise" style={{ animationDelay: "190ms" }}>
              <h2 className="mb-3.5 text-sm font-medium text-mute">Resting — worth dusting off</h2>
              <div className="glass overflow-hidden rounded-[var(--radius-card)]">
                <ul className="divide-y divide-border">
                  {intel.dormant.slice(0, 6).map((s) => (
                    <li key={s.title} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text">{s.title}</span>
                        <span className="block text-xs text-faint">sung {s.timesPlayed}× · key {s.primaryKey}</span>
                      </span>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-amber" style={{ background: "color-mix(in srgb, var(--color-amber) 16%, transparent)" }}>
                        {s.weeksSinceLast}w ago
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Key library */}
          <section className="rise" style={{ animationDelay: "220ms" }}>
            <h2 className="mb-3.5 text-sm font-medium text-mute">Where the team lives · keys</h2>
            <div className="glass rounded-[var(--radius-card)] p-5">
              <div className="space-y-2.5">
                {intel.keySpread.slice(0, 7).map((k) => {
                  const max = intel.keySpread[0].count;
                  return (
                    <div key={k.key} className="flex items-center gap-3">
                      <span className="w-6 shrink-0 font-display text-sm font-bold text-blue">{k.key}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full grad-brand" style={{ width: `${(k.count / max) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs text-mute">{k.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <p className="text-center text-xs text-faint">
            Live from Planning Center setlists · {intel.totalServices} services this window.
          </p>
        </div>
      )}

      <AppNav />
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="font-display text-4xl font-bold text-text">{value}</p>
      <p className="mt-1.5 text-sm text-mute text-balance">{label}</p>
    </div>
  );
}
