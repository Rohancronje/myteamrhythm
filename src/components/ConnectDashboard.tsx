"use client";

// The coach's connection workspace. A rolling 4-week plan: who to reach out to
// today, progress through the cycle, quick call/text/email, and a short FYI note
// (explicitly NOT confidential record-keeping) to prime the next conversation.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CoachConnect, ConnectPerson } from "@/lib/data/connect";
import type { ServeRef } from "@/lib/data/serving";
import { daysFromToday } from "@/lib/time";

export function ConnectDashboard({ data }: { data: CoachConnect }) {
  const shownIds = new Set([...data.today, ...data.doneToday].map((p) => p.id));
  const rest = data.people.filter((p) => !shownIds.has(p.id));
  return (
    <div className="space-y-7">
      {/* Cycle progress */}
      <section className="rise glass-edge relative overflow-hidden rounded-[var(--radius-card)] p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple/25 blur-3xl" />
        <p className="relative mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">This 4-week cycle{data.coachCount > 1 ? " · as a team" : ""}</p>
        <div className="relative flex items-end justify-between gap-4">
          <p className="text-[22px] font-medium leading-[1.35] text-text text-balance">
            {data.coachCount > 1 ? "Your team has" : "You’ve"} connected with{" "}
            <span className="font-display font-bold grad-text">{data.contactedCount} of {data.total}</span>{" "}
            {data.total === 1 ? "person" : "people"} this cycle.
          </p>
          <span className="shrink-0 font-display text-4xl font-bold text-text">{data.contactedPct}%</span>
        </div>
        <div className="relative mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="h-full rounded-full grad-brand transition-[width] duration-500" style={{ width: `${data.contactedPct}%`, minWidth: "6px" }} />
        </div>
        {data.coachCount > 1 && data.contactedCount > 0 && (
          <p className="relative mt-3 text-xs text-mute">
            You&apos;ve reached <span className="font-semibold text-text">{data.contactedByYouCount}</span>{" "}
            {data.contactedByYouCount === 1 ? "yourself" : "of them yourself"}
            {data.contactedCount > data.contactedByYouCount ? <> · teammates covered the other {data.contactedCount - data.contactedByYouCount}</> : null}.
          </p>
        )}
        {data.contactedCount === 0 && (
          <p className="relative mt-3 text-xs text-mute">Fresh cycle — no one reached yet. Start with today&apos;s list below.</p>
        )}
      </section>

      {/* Stat tiles */}
      <section className="rise grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: "30ms" }}>
        <StatTile label="Team" value={`${data.total}`} sub="people" />
        <StatTile
          label={data.coachCount > 1 ? "Team connected" : "Connected"}
          value={`${data.contactedPct}%`}
          sub={data.coachCount > 1 ? `${data.contactedByYouCount} by you · ${data.contactedCount} total` : `${data.contactedCount} this cycle`}
        />
        <StatTile label="Left today" value={`${data.today.length}`} sub={`${data.doneToday.length} reached today`} />
        <StatTile label="Still to reach" value={`${data.people.filter((p) => p.due).length}`} sub="this cycle" />
      </section>

      {/* Birthdays soon */}
      {data.birthdaysSoon.length > 0 && (
        <section className="rise overflow-hidden rounded-[var(--radius-card)] p-5" style={{ animationDelay: "40ms", background: "linear-gradient(135deg, rgba(92,194,255,0.14), rgba(139,108,255,0.10))", border: "1px solid rgba(92,194,255,0.28)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue">🎂 Birthdays this week</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {data.birthdaysSoon.map((p) => (
              <span key={p.id} className="rounded-full border border-border bg-surface-solid px-3 py-1 text-xs font-semibold text-text">
                {p.name.split(" ")[0]} · {p.birthdayInDays === 0 ? "today" : `in ${p.birthdayInDays}d`}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Today's connects */}
      <section className="rise" style={{ animationDelay: "80ms" }}>
        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-mute">To connect today</h2>
          <span className="text-xs text-faint">{data.today.length} left{data.doneToday.length > 0 ? ` · ${data.doneToday.length} done` : ""}</span>
        </div>
        {data.today.length === 0 ? (
          <div className="glass rounded-[var(--radius-card)] p-6 text-center">
            <p className="font-display text-lg text-text">You&apos;re all caught up 🎉</p>
            <p className="mt-1.5 text-sm text-mute">
              {data.doneToday.length > 0
                ? `You've reached ${data.doneToday.length} ${data.doneToday.length === 1 ? "person" : "people"} today. Nice work.`
                : "No one is due today. Enjoy the breather."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {data.today.map((p) => <ConnectCard key={p.id} p={p} highlight />)}
          </div>
        )}

        {/* Reached today — completed, so a logged contact visibly "checks off" here
            instead of a new face back-filling the list. */}
        {data.doneToday.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#38dd9b" }}>Reached today</span>
            {data.doneToday.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-solid px-2.5 py-1 text-xs text-text">
                <span style={{ color: "#38dd9b" }}>✓</span>{p.name.split(" ")[0]}
                {!p.lastContactedByYou && p.lastContactedBy ? <span className="text-faint">· {p.lastContactedBy.split(" ")[0]}</span> : null}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Everyone else */}
      {rest.length > 0 && (
        <section className="rise" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3.5 text-sm font-medium text-mute">Your team · {data.total}</h2>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {rest.map((p) => <ConnectCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mute">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-bold text-text">{value}</p>
      <p className="mt-0.5 text-xs text-mute">{sub}</p>
    </div>
  );
}

/** Normalise a phone number to WhatsApp's intl format (digits, country code).
 *  NZ default: a leading 0 becomes +64. Numbers with + / country code pass through. */
function waNumber(raw: string): string {
  const hasPlus = raw.trim().startsWith("+");
  const d = raw.replace(/\D/g, "");
  if (hasPlus) return d;
  if (d.startsWith("0")) return "64" + d.slice(1);
  return d;
}

function relTime(daysSince: number | null): string {
  if (daysSince === null) return "Never connected";
  if (daysSince === 0) return "Connected today";
  if (daysSince === 1) return "Connected yesterday";
  return `Connected ${daysSince}d ago`;
}

/** Format a YYYY-MM-DD serve date as "Sun 24 Aug" (parsed as a local calendar date). */
function fmtServeDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
}
/** A short relative hint for a serve date — "today", "in 5d", "12d ago". */
function relServe(d: string): string {
  const n = daysFromToday(d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n}d` : `${-n}d ago`;
}

/** One serving stat (last serve / next serving) with a graceful empty state. */
function ServeStat({ kind, serve, empty }: { kind: string; serve: ServeRef | null; empty: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-solid p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mute">{kind}</p>
      {serve ? (
        <>
          <p className="mt-1 text-sm font-semibold text-text">{fmtServeDate(serve.date)}</p>
          <p className="mt-0.5 truncate text-[11px] text-faint" title={serve.position || undefined}>
            {serve.serviceLabel} · {relServe(serve.date)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-faint">{empty}</p>
      )}
    </div>
  );
}

function ConnectCard({ p, highlight }: { p: ConnectPerson; highlight?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(p.email ?? "");
  const [phone, setPhone] = useState(p.phone ?? "");
  const [birthday, setBirthday] = useState(p.birthday ?? "");
  const [includeVerse, setIncludeVerse] = useState(true);

  const firstName = p.name.split(" ")[0];
  const waMessage = includeVerse && p.verse
    ? `Hi ${firstName}! 🙏\n\n"${p.verse.text}"\n— ${p.verse.reference}`
    : `Hi ${firstName}!`;
  const waHref = p.phone ? `https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(waMessage)}` : null;

  async function logConnect() {
    setBusy(true);
    try {
      await fetch("/api/connect/log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcoId: p.id, note }) });
      setNote("");
      setOpen(false);
      router.refresh();
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function saveContact() {
    setBusy(true);
    try {
      await fetch("/api/contacts/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcoId: p.id, email, phone, birthday }) });
      setEditing(false);
      router.refresh();
    } catch { /* ignore */ }
    setBusy(false);
  }

  return (
    <div className="glass overflow-hidden rounded-2xl" style={highlight ? { border: "1px solid rgba(139,108,255,0.28)" } : undefined}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-[2px]" style={{ background: "var(--color-surface-2)" }}>
          <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-xs font-bold text-text">{p.initials}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text">{p.name}</span>
            {p.role ? <span className="shrink-0 truncate text-[11px] text-faint">{p.role}</span> : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-mute">
            <span className="truncate">{relTime(p.daysSince)}{p.birthdayInDays !== null && p.birthdayInDays <= 30 ? ` · 🎂 ${p.birthdayInDays}d` : ""}</span>
            {p.contactedThisCycle && p.lastContactedBy && (
              p.lastContactedByYou ? (
                <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-faint">by you</span>
              ) : (
                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(56,221,155,0.14)", color: "#38dd9b" }}>✓ {p.lastContactedBy.split(" ")[0]}</span>
              )
            )}
          </span>
        </span>
        <span className="shrink-0 text-faint">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {/* Suggested verse for the week */}
          {p.verse && (
            <div className="mb-3 rounded-xl border p-3" style={{ borderColor: "rgba(139,108,255,0.28)", background: "linear-gradient(135deg, rgba(139,108,255,0.10), rgba(92,194,255,0.08))" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple">Verse to send · this week</p>
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-mute">
                  <input type="checkbox" checked={includeVerse} onChange={(e) => setIncludeVerse(e.target.checked)} style={{ accentColor: "var(--color-purple)" }} />
                  Include verse
                </label>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-text">&ldquo;{p.verse.text}&rdquo;</p>
              <p className="mt-1 text-xs font-semibold grad-text">— {p.verse.reference}</p>
            </div>
          )}

          {/* Planning Center serving context */}
          {p.serving && (p.serving.last || p.serving.next) && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <ServeStat kind="Last serve" serve={p.serving.last} empty="No record" />
              <ServeStat kind="Next serving" serve={p.serving.next} empty="Not rostered" />
            </div>
          )}

          {/* Quick contact actions */}
          <div className="flex flex-wrap gap-2">
            {waHref && <a href={waHref} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "#25D366" }}>💬 WhatsApp</a>}
            {p.phone ? <a href={`tel:${p.phone}`} className="rounded-full border border-border bg-surface-solid px-3 py-1.5 text-xs font-semibold text-text">📞 Call</a> : null}
            {p.email ? <a href={`mailto:${p.email}`} className="rounded-full border border-border bg-surface-solid px-3 py-1.5 text-xs font-semibold text-text">✉️ Email</a> : null}
            <button onClick={() => setEditing((e) => !e)} className="rounded-full border border-dashed border-border-strong px-3 py-1.5 text-xs font-semibold text-mute">
              {p.phone || p.email ? "Edit contact" : "Add contact"}
            </button>
          </div>

          {editing && (
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-solid p-3">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
              <label className="block text-[11px] text-faint">Birthday</label>
              <input value={birthday} onChange={(e) => setBirthday(e.target.value)} type="date" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
              <button onClick={saveContact} disabled={busy} className="w-full rounded-lg grad-brand py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Save contact"}</button>
            </div>
          )}

          {/* Last FYI note */}
          {p.lastNote && (
            <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs text-mute"><span className="font-semibold text-faint">Last note · </span>{p.lastNote}</p>
          )}

          {/* Log a connect */}
          <div className="mt-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional FYI for next time — e.g. 'just started a new job', 'away in Sept'"
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint"
            />
            <p className="mt-1 text-[10px] text-faint">FYI to prime your next chat — not confidential records. Auto-checked for privacy (NZ Privacy Act 2020) before saving.</p>
            <button onClick={logConnect} disabled={busy} className="mt-2 w-full rounded-full grad-mint py-2.5 text-sm font-bold text-[#04231a] disabled:opacity-40">
              {busy ? "Saving…" : "✓ Log this connect"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
