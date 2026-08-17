import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { RhythmLine } from "@/components/RhythmLine";
import { getTeamPerson } from "@/lib/data/source";
import { assessRisk } from "@/lib/rhythm/insights";
import { RISK_META } from "@/lib/rhythm/presentation";
import { ZONE_META } from "@/lib/rhythm/presentation";

export const dynamic = "force-dynamic";

// A person's own serving journey — the same data returned to the person it
// belongs to. Reached by the volunteer, or by a pastoral lead who has unlocked
// them after a threshold. A mirror, not a microscope.

export default async function JourneyPage({ params }: PageProps<"/journey/[id]">) {
  const { id } = await params;
  const p = getTeamPerson(id);
  if (!p) notFound();

  const { person, rhythm, trend } = p;
  const zone = ZONE_META[rhythm.zone];
  const risk = assessRisk(p);
  const meta = RISK_META[risk.level];
  const totalServes = p.events.filter((e) => e.status === "confirmed").length;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6 sm:px-8">
      <div className="rise flex items-center justify-between">
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-ink">
          ← Team
        </Link>
        <Wordmark />
      </div>

      {/* Hero */}
      <header className="rise mt-6 card p-6 sm:p-8" style={{ animationDelay: "40ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-xl text-white"
              style={{ background: zone.color }}
            >
              {person.initials}
            </div>
            <div>
              <h1 className="font-display text-3xl text-ink">{person.name}</h1>
              <p className="text-sm text-ink-soft">
                {person.team} · {person.role}
              </p>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.label} risk
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-faint">
            <span>Serving rhythm · last 26 weeks</span>
            <span>{zone.label}</span>
          </div>
          <RhythmLine series={rhythm.series} color={zone.color} width={760} height={130} animate />
        </div>
      </header>

      {/* Stats */}
      <section className="rise mt-4 grid gap-3 sm:grid-cols-3" style={{ animationDelay: "100ms" }}>
        <Stat label="Times served" value={`${totalServes}`} sub="in this window" />
        <Stat
          label="Load vs. their normal"
          value={rhythm.currentAcwr !== null ? `${rhythm.currentAcwr.toFixed(2)}×` : "—"}
          sub={zone.blurb}
        />
        <Stat
          label="Since last break"
          value={rhythm.weeksSinceLastBreak === null ? `${rhythm.weeksWithoutBreak}w+` : `${rhythm.weeksSinceLastBreak}w`}
          sub={rhythm.weeksWithoutBreak >= 8 ? "A rest week would be well earned." : "A healthy amount of space."}
        />
      </section>

      {/* Risk factors */}
      <section className="rise mt-4 card p-6" style={{ animationDelay: "140ms" }}>
        <h2 className="text-base font-semibold text-ink">What Rhythm noticed</h2>
        {risk.factors.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Serving in a sustainable rhythm. Nothing flagged.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {risk.factors.map((f) => (
              <li key={f.key} className="flex items-center gap-2.5 text-sm text-ink-soft">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: f.severity === 3 ? "var(--color-high)" : f.severity === 2 ? "var(--color-elevated)" : "var(--color-watch)" }}
                />
                {f.label}
              </li>
            ))}
          </ul>
        )}
        {(risk.level === "high" || risk.level === "elevated") && (
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
            Not a verdict — a nudge to grab a coffee and ask, honestly, how they are.
          </p>
        )}
      </section>

      {/* Feeling */}
      <section className="rise mt-4 card p-6" style={{ animationDelay: "180ms" }}>
        <h2 className="text-base font-semibold text-ink">How serving has felt</h2>
        {trend.sampleSize > 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            Across the last {trend.sampleSize} check-ins, energy after serving sits around{" "}
            <strong className="text-ink">{trend.wellbeing.toFixed(1)}/5</strong>.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            No pulse check-ins yet — this is load only. The first check-in starts the feeling story.
          </p>
        )}
      </section>

      <footer className="mt-8 text-center text-sm text-ink-faint">
        This view belongs to {person.name.split(" ")[0]}. Rhythm is a mirror, not a microscope.
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1.5 font-display text-4xl text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-soft text-balance">{sub}</p>
    </div>
  );
}
