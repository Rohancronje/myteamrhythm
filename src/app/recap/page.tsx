import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { getSession } from "@/lib/auth/server";
import { getRecapFor } from "@/lib/data/recap";

export const dynamic = "force-dynamic";

// "Your Year in Rhythm" — a personal, celebratory recap from existing data.
export default async function RecapPage() {
  const session = await getSession();
  const recap = await getRecapFor(session?.personId, session?.name ?? "You");

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/next" className="text-sm text-mute transition-colors hover:text-text">← Back</Link>
        <Wordmark />
      </header>

      {!recap ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">Your recap is still filling in.</p>
          <p className="mt-2 text-sm text-mute">Once you&apos;ve served a few times, your Year in Rhythm will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rise rounded-[var(--radius-card)] p-7 text-center" style={{ background: "var(--grad-brand)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Your Year in Rhythm</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">{recap.name.split(" ")[0]}, you showed up.</p>
          </section>

          <section className="rise grid grid-cols-2 gap-4" style={{ animationDelay: "60ms" }}>
            <Big value={`${recap.totalServices}`} label="times served" />
            <Big value={`${recap.weeksServed}`} label="weeks on the team" />
          </section>

          {recap.favouriteService && (
            <section className="rise glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "100ms" }}>
              <p className="text-sm text-mute">Your home turf</p>
              <p className="mt-1 font-display text-2xl font-bold grad-text">{recap.favouriteService}</p>
            </section>
          )}

          {recap.partners.length > 0 && (
            <section className="rise glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "140ms" }}>
              <p className="mb-3 text-sm text-mute">You served most with</p>
              <ul className="space-y-2.5">
                {recap.partners.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full grad-mint font-display text-xs font-bold text-[#04231a]">{i + 1}</span>
                    <span className="flex-1 font-medium text-text">{p.name}</span>
                    <span className="text-sm text-mute">{p.together}× together</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rise grid grid-cols-2 gap-4" style={{ animationDelay: "180ms" }}>
            <Big value={`${recap.thanksReceived}`} label="times thanked by teammates" />
            <Big value={`${recap.teams.length}`} label="roles you filled" />
          </section>

          <p className="rise pt-2 text-center text-sm text-mute" style={{ animationDelay: "220ms" }}>
            Thank you for how you serve. 💜
          </p>
        </div>
      )}

      <AppNav />
    </div>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-[var(--radius-card)] p-6 text-center">
      <p className="font-display text-5xl font-bold text-text">{value}</p>
      <p className="mt-2 text-xs text-mute text-balance">{label}</p>
    </div>
  );
}
