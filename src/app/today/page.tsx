import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { MarkRead } from "@/components/MarkRead";
import { getSession } from "@/lib/auth/server";
import { getReadingToday, getReadingUpcoming, getReadingStreak, fetchPassage } from "@/lib/data/reading";

export const dynamic = "force-dynamic";

// Daily devotional (rhythm_today). Verse of the day, team plan tied to the series,
// and a personal reading streak — the ENCOURAGED kind, with grace days.

export default async function TodayPage() {
  const session = await getSession();
  const today = await getReadingToday();
  const passage = today ? await fetchPassage(today.reference) : null;
  const streak = await getReadingStreak(session?.personId);
  const upcoming = await getReadingUpcoming(6);

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">Today · devotional</p>
        </div>
        <AccountChip />
      </header>

      {/* Reading streak (encouraged, gamified) */}
      {session?.personId && (
        <section className="rise mb-4 flex items-center gap-4 rounded-[var(--radius-card)] p-5" style={{ background: "linear-gradient(135deg, rgba(255,180,84,0.16), rgba(255,92,138,0.12))", border: "1px solid rgba(255,180,84,0.3)" }}>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-solid text-2xl">🔥</div>
          <div>
            <p className="font-display text-2xl font-bold text-text">{streak.streak}-day streak</p>
            <p className="text-xs text-mute">
              {streak.readToday ? "You've read today." : "Read today to keep it going."}
              {streak.graceUsed > 0 ? ` · ${streak.graceUsed} grace ${streak.graceUsed === 1 ? "day" : "days"} used` : ""}
            </p>
          </div>
        </section>
      )}

      {/* Verse of the day */}
      {today ? (
        <section className="rise glass rounded-[var(--radius-card)] p-6">
          {today.seriesTitle && <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-purple">{today.seriesTitle}</p>}
          <h1 className="mt-1 font-display text-2xl font-bold text-text">{today.reference}</h1>
          {passage ? (
            <p className="mt-4 max-h-[46vh] overflow-y-auto whitespace-pre-wrap text-[15px] leading-relaxed text-mute">{passage.text}</p>
          ) : (
            <p className="mt-4 text-sm text-faint">Couldn&apos;t load the passage right now — try again shortly.</p>
          )}
          <p className="mt-3 text-[11px] text-faint">World English Bible (public domain)</p>
          <div className="mt-5">
            {session?.personId ? <MarkRead readToday={streak.readToday} /> : <p className="text-center text-xs text-faint">Sign in with your profile to track your reading.</p>}
          </div>
        </section>
      ) : (
        <section className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No reading set for today.</p>
          <p className="mt-2 text-sm text-mute">The team reading plan hasn&apos;t been set for today yet.</p>
        </section>
      )}

      {/* Upcoming in the plan */}
      {upcoming.length > 1 && (
        <section className="rise mt-4 glass rounded-[var(--radius-card)] p-5">
          <h2 className="mb-3 text-sm font-medium text-text">Coming up in {upcoming[0].seriesTitle ?? "the plan"}</h2>
          <ul className="space-y-2">
            {upcoming.slice(1).map((d) => (
              <li key={d.day} className="flex items-center justify-between text-sm">
                <span className="text-text">{d.reference}</span>
                <span className="text-xs text-faint">{new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", timeZone: "Pacific/Auckland" }).format(new Date(d.day + "T12:00:00Z"))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AppNav />
    </div>
  );
}
