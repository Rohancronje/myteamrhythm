import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { getSession } from "@/lib/auth/server";
import { getUserTeams } from "@/lib/auth/users";
import { getAllTeamIds } from "@/lib/data/teams-admin";
import { getMonthBirthdays, type BirthdayPerson } from "@/lib/data/birthdays";
import { nzNowAnchor } from "@/lib/time";

export const dynamic = "force-dynamic";

// Birthdays this month — coaches see their teams, admins see everyone. "Coming up"
// (today onward) is separated from "earlier this month" so the remaining ones lead.
export default async function BirthdaysPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "coach" && session.role !== "admin") redirect("/login");

  const now = nzNowAnchor();
  const teamIds = session.role === "admin" ? await getAllTeamIds() : await getUserTeams(session.email);
  const people = await getMonthBirthdays(teamIds, now);
  const monthName = new Intl.DateTimeFormat("en-NZ", { month: "long", timeZone: "UTC" }).format(now);

  const upcoming = people.filter((p) => p.when !== "past");
  const past = people.filter((p) => p.when === "past");

  return (
    <main className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-12 2xl:max-w-5xl">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <h1 className="mt-1.5 text-sm font-normal text-mute">Birthdays · {monthName}</h1>
        </div>
        <AccountChip />
      </header>

      {people.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No birthdays in {monthName}.</p>
          <p className="mt-2 text-sm text-mute">Add birthdays to your volunteers and they&apos;ll show up here each month.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title={`Coming up · ${monthName}`} people={upcoming} emptyNote="Everyone's birthday this month has already passed." />
          {past.length > 0 && <Section title="Earlier this month" people={past} dim />}
        </div>
      )}

      <AppNav />
    </main>
  );
}

function Section({ title, people, dim, emptyNote }: { title: string; people: BirthdayPerson[]; dim?: boolean; emptyNote?: string }) {
  return (
    <section className="rise">
      <h2 className="mb-3 text-sm font-medium text-mute">{title}</h2>
      {people.length === 0 ? (
        emptyNote ? <p className="text-sm text-faint">{emptyNote}</p> : null
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {people.map((p) => <Row key={p.id} p={p} dim={dim} />)}
        </ul>
      )}
    </section>
  );
}

function Row({ p, dim }: { p: BirthdayPerson; dim?: boolean }) {
  const isToday = p.when === "today";
  const first = p.name.split(" ")[0];
  const wa = p.phone ? `https://wa.me/${waNumber(p.phone)}?text=${encodeURIComponent(`Happy birthday ${first}! 🎉🎂 Hope you have a wonderful day.`)}` : null;

  return (
    <li
      className="glass flex items-center gap-3 rounded-2xl p-4"
      style={{ opacity: dim ? 0.6 : 1, border: isToday ? "1px solid rgba(255,180,84,0.4)" : undefined, background: isToday ? "linear-gradient(135deg, rgba(255,180,84,0.14), rgba(255,92,138,0.10))" : undefined }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full grad-brand font-display text-xs font-bold text-white">{p.initials}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{p.name}</p>
        <p className="truncate text-xs text-mute">{p.team}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-text">{p.dateLabel}</p>
        <p className="text-[11px]" style={{ color: isToday ? "#ffb454" : "var(--color-faint)" }}>
          {isToday ? "🎂 Today" : p.when === "past" ? "passed" : p.daysUntil === 1 ? "tomorrow" : `in ${p.daysUntil}d`}
        </p>
      </div>
      {wa && p.when !== "past" && (
        <a href={wa} target="_blank" rel="noopener noreferrer" title="Wish happy birthday" className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "#25D366" }}>🎉</a>
      )}
    </li>
  );
}

/** Normalise a phone number to WhatsApp intl format. NZ default: leading 0 → +64. */
function waNumber(raw: string): string {
  const hasPlus = raw.trim().startsWith("+");
  const d = raw.replace(/\D/g, "");
  if (hasPlus) return d;
  if (d.startsWith("0")) return "64" + d.slice(1);
  return d;
}
