// "Your next service" — the prototype, made live. Countdown, call times, set
// order + keys, and the roster ("who else is serving") all from Planning Center.

import { serviceLabel, type UpcomingService } from "@/lib/data/upcoming";

const TZ = "Pacific/Auckland"; // NS Family Services is in NZ

function fmtDate(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00Z");
  return new Intl.DateTimeFormat("en-NZ", { weekday: "long", month: "short", day: "numeric", timeZone: TZ }).format(d);
}
function fmtTime(startsAt: string): string {
  const d = new Date(startsAt);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ })
    .format(d)
    .replace(" ", "")
    .toLowerCase();
}
function countdown(dateISO: string): string {
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const s = new Date(dateISO + "T00:00:00Z");
  const t1 = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const days = Math.round((t1 - t0) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function NextService({
  service,
  myPosition,
  personal,
}: {
  service: UpcomingService;
  myPosition?: string;
  personal: boolean;
}) {
  // A person can hold multiple positions on one plan — show each person once,
  // merging their roles, so the count and chips aren't inflated.
  const byPerson = new Map<string, { name: string; positions: string[]; team: string }>();
  for (const r of service.roster) {
    const e = byPerson.get(r.pcoId) ?? { name: r.name, positions: [], team: r.team };
    if (r.position && !e.positions.includes(r.position)) e.positions.push(r.position);
    byPerson.set(r.pcoId, e);
  }
  const roster = [...byPerson.entries()].map(([pcoId, e]) => ({ pcoId, name: e.name, position: e.positions.join(" · "), team: e.team }));
  const shown = roster.slice(0, 5);
  const rest = roster.length - shown.length;
  const gcalStart = service.date.replace(/-/g, "");

  return (
    <div className="space-y-4">
      {/* Hero date */}
      <section
        className="rise relative overflow-hidden rounded-[var(--radius-card)] p-6"
        style={{ background: "linear-gradient(135deg, rgba(139,108,255,0.2), rgba(255,92,138,0.14))", border: "1px solid rgba(139,108,255,0.3)" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-purple">{countdown(service.date)}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text">{fmtDate(service.date)}</h1>
        <p className="mt-1 text-sm text-mute">
          NS Family Services · {serviceLabel(service.serviceType)}
          {service.seriesTitle ? ` · ${service.seriesTitle}` : ""}
        </p>
        {personal && myPosition && (
          <span className="mt-4 inline-block rounded-full border border-border bg-white/10 px-3.5 py-1.5 text-sm font-semibold">
            🎤 {myPosition}
          </span>
        )}
        {!personal && <span className="mt-4 inline-block rounded-full border border-border bg-white/10 px-3.5 py-1.5 text-sm font-semibold">Whole-team view</span>}
      </section>

      {/* Call times */}
      {service.times.length > 0 && (
        <section className="rise glass rounded-[var(--radius-card)] p-5" style={{ animationDelay: "60ms" }}>
          <h2 className="font-display text-base font-bold text-text">Call times</h2>
          <p className="mb-4 text-xs text-mute">From Planning Center plan times</p>
          <div className="flex gap-3">
            {service.times.slice(0, 3).map((t) => (
              <div key={t.name + t.startsAt} className="flex-1 rounded-2xl bg-surface-solid p-3.5 text-center">
                <div className="font-display text-lg font-bold text-text">{fmtTime(t.startsAt)}</div>
                <div className="mt-1 text-[10px] text-mute">{t.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Set order & keys */}
      <section className="rise glass rounded-[var(--radius-card)] p-5" style={{ animationDelay: "100ms" }}>
        <h2 className="font-display text-base font-bold text-text">Set order &amp; keys</h2>
        <p className="mb-3 text-xs text-mute">Live from the Planning Center setlist</p>
        {service.songs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-sm text-mute">
            Setlist not planned yet — it&apos;ll appear here once the worship lead builds it.
          </p>
        ) : (
          <ul>
            {service.songs.map((s, i) => (
              <li key={s.title + i} className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-solid font-display text-[11px] font-bold text-purple">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{s.title}</span>
                {s.bpm ? <span className="shrink-0 text-xs text-faint">{s.bpm}bpm</span> : null}
                <span className="shrink-0 rounded-lg bg-purple/15 px-2.5 py-1 font-display text-xs font-bold text-purple">{s.key ? `Key ${s.key}` : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Who else is serving */}
      <section className="rise glass rounded-[var(--radius-card)] p-5" style={{ animationDelay: "140ms" }}>
        <h2 className="font-display text-base font-bold text-text">Who else is serving</h2>
        <p className="mb-4 text-xs text-mute">{roster.length} people rostered · real data, pulled live</p>
        <div className="flex flex-wrap gap-2.5">
          {shown.map((p) => (
            <span key={p.pcoId} className="flex items-center gap-2 rounded-full border border-border bg-surface-solid py-1.5 pl-1.5 pr-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full grad-brand font-display text-[9px] font-bold text-white">
                {p.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("")}
              </span>
              <span className="text-xs font-semibold text-text">
                {p.name.split(" ")[0]}
                <span className="block text-[9.5px] font-medium text-mute">{p.position || p.team}</span>
              </span>
            </span>
          ))}
          {rest > 0 && (
            <span className="flex items-center gap-2 rounded-full border border-border bg-surface-solid py-1.5 pl-1.5 pr-3 opacity-70">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 font-display text-[9px] font-bold text-mute">+{rest}</span>
              <span className="text-xs font-semibold text-mute">others serving</span>
            </span>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="rise flex gap-2.5" style={{ animationDelay: "180ms" }}>
        <a
          href={`https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Serving · ${serviceLabel(service.serviceType)}`)}&dates=${gcalStart}/${gcalStart}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl grad-brand py-3 text-center text-sm font-bold text-white"
        >
          Add to calendar
        </a>
        <span className="flex-1 cursor-not-allowed rounded-xl border border-border bg-white/5 py-3 text-center text-sm font-semibold text-mute" title="Coming soon">
          Message the team
        </span>
      </div>
    </div>
  );
}
