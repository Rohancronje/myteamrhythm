import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { DotCalendar } from "@/components/DotCalendar";
import { getMember } from "@/lib/data/team";
import { STATUS_META } from "@/lib/rhythm/status";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

// Individual profile. Admins see it as a pastoral profile (care notes, unlock is
// logged). The person themselves sees it as *their own* view — same rhythm data,
// but no pastoral care notes, and encouraging framing. Non-admins can only ever
// open their OWN profile.

export default async function PersonPage({ params }: PageProps<"/journey/[id]">) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const isAdmin = session.role === "admin";
  const isSelf = session.personId === id;

  // Ownership: non-admins may only open their own profile.
  if (!isAdmin && !isSelf) {
    redirect(session.personId ? `/journey/${session.personId}` : "/pulse");
  }

  const m = getMember(id);
  if (!m) notFound();

  const a = m.assessment;
  const meta = STATUS_META[a.status];

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        {isAdmin ? (
          <Link href="/" className="text-sm text-mute transition-colors hover:text-text">← Home</Link>
        ) : (
          <span className="text-sm font-medium text-text">Your rhythm</span>
        )}
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
              <h1 className="font-display text-2xl font-bold text-text">{isSelf ? m.name.split(" ")[0] : m.name}</h1>
              <p className="text-sm text-mute">{m.team} · {m.role}</p>
            </div>
          </div>
          <span className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ color: meta.color, background: meta.soft }}>
            {meta.label}
          </span>
        </div>

        {a.reason && (
          <p className="mt-5 text-[15px] leading-relaxed text-text text-balance">
            {isSelf ? selfReason(a.reason) : `${a.reason}.`}
          </p>
        )}
      </section>

      {/* Plain-language stats */}
      <section className="rise mt-4 grid grid-cols-3 gap-3" style={{ animationDelay: "60ms" }}>
        <Stat label="This window" value={`${a.totalServices}`} sub="services" />
        <Stat label="Current streak" value={a.streakWeeks > 0 ? `${a.streakWeeks}` : "—"} sub={a.streakWeeks > 0 ? "weeks in a row" : "on a break"} />
        <Stat label="This week" value={`${a.servicesThisWeek}`} sub={a.servicesThisWeek === 1 ? "service" : "services"} />
      </section>

      {/* Dot-calendar */}
      <section className="rise mt-4 glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "100ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-text">{isSelf ? "Your serving rhythm" : "Serving rhythm"}</h2>
          <span className="text-xs text-faint">last 26 weeks · each dot a week</span>
        </div>
        <DotCalendar weeks={a.weeklyDots} color={meta.color} size={11} />
        <p className="mt-3 text-xs text-faint">Filled = served that week · hollow = a break.</p>
      </section>

      {/* Setlist shortcut for worship leaders viewing themselves */}
      {isSelf && session.role === "leader" && (
        <Link href="/songs" className="rise mt-4 flex items-center justify-between rounded-[var(--radius-card)] glass p-5" style={{ animationDelay: "130ms" }}>
          <span>
            <span className="block text-sm font-semibold text-text">Song Intelligence</span>
            <span className="block text-xs text-mute">Rotation, keys and setlists for the team</span>
          </span>
          <span className="grad-text text-sm font-medium">Open →</span>
        </Link>
      )}

      {/* Pulse — honest empty state */}
      <section className="rise mt-4 glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "160ms" }}>
        <h2 className="text-sm font-medium text-text">How serving has felt</h2>
        <p className="mt-2 text-sm text-mute">No check-ins logged yet. {isSelf ? "Your" : "Their"} pulse responses will appear here once they begin.</p>
      </section>

      {/* Care notes — pastoral only, never shown to the person themselves */}
      {isAdmin && (
        <section className="rise mt-4 rounded-[var(--radius-card)] border border-dashed border-border-strong p-6" style={{ animationDelay: "200ms" }}>
          <h2 className="text-sm font-medium text-text">Care notes</h2>
          <p className="mt-2 text-sm text-mute">Empty. Notes are added by pastoral leads after a real conversation — never auto-filled.</p>
        </section>
      )}

      <p className="mt-6 text-center text-xs text-faint">
        {isAdmin ? "This view is pastoral. Rhythm is a mirror, not a microscope." : "This is your own view. Only pastoral care can see it too."}
      </p>

      <AppNav />
    </div>
  );
}

/** Reframe a flag reason gently in the second person for the person's own view. */
function selfReason(reason: string): string {
  const lower = reason.charAt(0).toLowerCase() + reason.slice(1);
  return `Heads up — ${lower}. Might be worth a rest soon.`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <p className="font-display text-4xl font-bold text-text">{value}</p>
      <p className="mt-1.5 text-xs text-mute">{sub}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}
