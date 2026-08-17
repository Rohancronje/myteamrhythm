import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { RhythmLine } from "@/components/RhythmLine";
import { getPerson } from "@/lib/data/seed";
import { ATTENTION_META, ZONE_META } from "@/lib/rhythm/presentation";

// A person's own serving journey. The counter-weight to surveillance: the same
// data, returned to the person it belongs to, told as encouragement. Reached by
// the volunteer themselves, or by a pastoral-care lead who has unlocked them.

export default async function JourneyPage({ params }: PageProps<"/journey/[id]">) {
  const { id } = await params;
  const p = getPerson(id);
  if (!p) notFound();

  const { person, rhythm, trend, signal } = p;
  const zone = ZONE_META[rhythm.zone];
  const attention = ATTENTION_META[signal.attention];

  const totalServes = p.events.filter((e) => e.status === "confirmed").length;
  const arrow =
    signal.wellbeingSlope === null
      ? "→"
      : signal.wellbeingSlope < -0.05
        ? "↓"
        : signal.wellbeingSlope > 0.05
          ? "↑"
          : "→";

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-16 sm:px-8">
      <div className="rise flex items-center justify-between pt-10">
        <Link href="/" className="text-sm text-cream-soft transition-colors hover:text-cream">
          ← Team
        </Link>
        <Wordmark />
      </div>

      {/* Hero */}
      <header
        className="rise relative mt-8 overflow-hidden rounded-[var(--radius-card)] glass p-7 sm:p-10"
        style={{ animationDelay: "60ms" }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: zone.color }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl text-night"
              style={{ background: zone.color, boxShadow: `0 0 34px -6px ${zone.color}` }}
            >
              {person.initials}
            </div>
            <div>
              <h1 className="font-display text-4xl text-cream">{person.name}</h1>
              <p className="text-cream-soft">
                {person.team} · {person.role}
              </p>
            </div>
          </div>
          <span
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: `${attention.color}22`, color: attention.color }}
          >
            {attention.label}
          </span>
        </div>

        <div className="relative mt-8">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-cream-faint">
            <span>Your serving rhythm · last 26 weeks</span>
            <span>{zone.label}</span>
          </div>
          <RhythmLine series={rhythm.series} color={zone.color} width={760} height={150} animate />
        </div>
      </header>

      {/* Stats */}
      <section className="rise mt-4 grid gap-4 sm:grid-cols-3" style={{ animationDelay: "120ms" }}>
        <Stat label="Times served" value={`${totalServes}`} sub="in this window" />
        <Stat
          label="Load vs. your normal"
          value={rhythm.currentAcwr !== null ? `${rhythm.currentAcwr.toFixed(2)}×` : "—"}
          sub={zone.blurb}
        />
        <Stat
          label="Since your last break"
          value={
            rhythm.weeksSinceLastBreak === null
              ? `${rhythm.weeksWithoutBreak}w+`
              : `${rhythm.weeksSinceLastBreak}w`
          }
          sub={
            rhythm.weeksWithoutBreak >= 8
              ? "A rest week would be well earned."
              : "A healthy amount of space."
          }
        />
      </section>

      {/* Feeling */}
      <section className="rise mt-4 glass rounded-[var(--radius-card)] p-7" style={{ animationDelay: "160ms" }}>
        <h2 className="font-display text-2xl text-cream">How serving has felt</h2>
        {trend.sampleSize > 0 ? (
          <>
            <p className="mt-3 text-lg text-cream-soft text-balance">
              Across your last {trend.sampleSize} check-ins, your energy after
              serving sits around{" "}
              <strong className="text-cream">{trend.wellbeing.toFixed(1)}/5</strong> and is
              trending{" "}
              <strong className="text-cream">
                {arrow}{" "}
                {arrow === "↓" ? "gently down" : arrow === "↑" ? "up" : "steady"}
              </strong>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Energy", "Meaning"].map((dim) => (
                <span
                  key={dim}
                  className="rounded-full border border-line bg-night-2 px-4 py-1.5 text-sm text-cream-soft"
                >
                  {dim}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 text-cream-soft">
            No check-ins yet. Your first pulse will start this story.
          </p>
        )}
      </section>

      {/* What Rhythm noticed */}
      <section
        className="rise mt-4 overflow-hidden rounded-[var(--radius-card)] border p-7"
        style={{
          animationDelay: "200ms",
          borderColor: `${attention.color}66`,
          background: `${attention.color}12`,
        }}
      >
        <h2 className="font-display text-2xl text-cream">What Rhythm noticed</h2>
        <p className="mt-1 text-sm text-cream-faint">{attention.note}</p>
        <ul className="mt-4 space-y-2.5">
          {signal.reasons.map((r) => (
            <li key={r} className="flex gap-2.5 text-cream-soft">
              <span style={{ color: attention.color }}>◦</span>
              {r}
            </li>
          ))}
        </ul>
        {(signal.attention === "check_in" || signal.attention === "priority") && (
          <p className="mt-5 border-t border-line pt-5 text-cream-soft text-balance">
            Not a verdict — a nudge to grab a coffee and ask, honestly, how they are.
          </p>
        )}
      </section>

      <footer className="mt-10 text-center text-sm text-cream-faint">
        This view belongs to {person.name.split(" ")[0]}. Rhythm is a mirror, not a
        microscope.
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass card-hover rounded-[var(--radius-card)] p-6">
      <p className="text-xs uppercase tracking-wide text-cream-faint">{label}</p>
      <p className="mt-2 font-display text-5xl text-cream">{value}</p>
      <p className="mt-2 text-sm text-cream-soft text-balance">{sub}</p>
    </div>
  );
}
