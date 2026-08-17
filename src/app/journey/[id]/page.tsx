import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { BottomNav } from "@/components/BottomNav";
import { DotCalendar } from "@/components/DotCalendar";
import { getMember } from "@/lib/data/team";
import { STATUS_META } from "@/lib/rhythm/status";

export const dynamic = "force-dynamic";

// Individual pastoral profile (handover: rhythm_person_pastoral). Real name, plain
// language, dot-calendar rhythm — no charts. Care notes and pulse start empty and
// honest; they're filled from real conversations, never pre-populated.

export default async function PersonPage({ params }: PageProps<"/journey/[id]">) {
  const { id } = await params;
  const m = getMember(id);
  if (!m) notFound();

  const a = m.assessment;
  const meta = STATUS_META[a.status];

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-mute transition-colors hover:text-text">← Home</Link>
        <Wordmark />
      </header>

      {/* Identity */}
      <section className="rise glass rounded-[var(--radius-card)] p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full p-[2.5px]" style={{ background: meta.ring }}>
              <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-solid font-display text-lg font-bold">{m.initials}</span>
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-text">{m.name}</h1>
              <p className="text-sm text-mute">{m.team} · {m.role}</p>
            </div>
          </div>
          <span className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ color: meta.color, background: meta.soft }}>
            {meta.label}
          </span>
        </div>

        {a.reason && <p className="mt-5 text-[15px] leading-relaxed text-text text-balance">{a.reason}.</p>}
      </section>

      {/* Plain-language stats */}
      <section className="rise mt-4 grid grid-cols-3 gap-3" style={{ animationDelay: "60ms" }}>
        <Stat label="This window" value={`${a.totalServices}`} sub="services" />
        <Stat
          label="Current streak"
          value={a.streakWeeks > 0 ? `${a.streakWeeks}` : "—"}
          sub={a.streakWeeks > 0 ? "weeks in a row" : "on a break"}
        />
        <Stat label="This week" value={`${a.servicesThisWeek}`} sub={a.servicesThisWeek === 1 ? "service" : "services"} />
      </section>

      {/* Dot-calendar */}
      <section className="rise mt-4 glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "100ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">Serving rhythm</h2>
          <span className="text-xs text-faint">last 26 weeks · each dot a week</span>
        </div>
        <DotCalendar weeks={a.weeklyDots} color={meta.color} size={11} />
        <p className="mt-3 text-xs text-faint">Filled = served that week · hollow = a break.</p>
      </section>

      {/* Pulse — honest empty state */}
      <section className="rise mt-4 glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "140ms" }}>
        <h2 className="text-sm font-medium text-text">How serving has felt</h2>
        <p className="mt-2 text-sm text-mute">No check-ins logged yet. Pulse responses will appear here once they begin.</p>
      </section>

      {/* Care notes — for leads to fill from real conversations */}
      <section className="rise mt-4 rounded-[var(--radius-card)] border border-dashed border-border-strong p-6" style={{ animationDelay: "180ms" }}>
        <h2 className="text-sm font-medium text-text">Care notes</h2>
        <p className="mt-2 text-sm text-mute">Empty. Notes are added by pastoral leads after a real conversation — never auto-filled.</p>
      </section>

      <p className="mt-6 text-center text-xs text-faint">This unlock is logged. Rhythm is a mirror, not a microscope.</p>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <p className="font-display text-3xl font-bold text-text">{value}</p>
      <p className="mt-1 text-xs text-mute">{sub}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}
