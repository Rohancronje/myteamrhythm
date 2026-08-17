import { PulseForm } from "@/components/PulseForm";
import { Wordmark } from "@/components/Wordmark";

// The post-service pulse. Reached via a web link (texted / emailed / QR after a
// service). No login wall — the link carries a pseudonymous token in production.
// Two questions, ten seconds. The whole trust model rests on this feeling light.

export default async function PulsePage({ searchParams }: PageProps<"/pulse">) {
  const sp = await searchParams;
  const service = typeof sp.service === "string" ? sp.service : "Sunday AM";

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-xl flex-col px-5 py-12 sm:py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--color-ember)" }}
      />
      <header className="rise relative mb-10 text-center">
        <Wordmark className="justify-center" />
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.2em] text-ember">
          {service}
        </p>
        <p className="mt-3 font-display text-4xl leading-tight text-cream text-balance sm:text-5xl">
          How was serving today?
        </p>
        <p className="mt-4 text-cream-soft text-balance">
          Ten seconds, honest as you like. Your name never appears on the team
          view — only you and pastoral care ever see this.
        </p>
      </header>

      <div className="relative">
        <PulseForm service={service} />
      </div>

      <p className="relative mt-8 text-center text-xs text-cream-faint">
        Your answers build your own private serving journey. Skip any question,
        stop any time.
      </p>
    </main>
  );
}
