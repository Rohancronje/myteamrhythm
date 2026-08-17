import { PulseForm } from "@/components/PulseForm";
import { Wordmark } from "@/components/Wordmark";

// The post-service pulse. Reached via a web link after a service. No login wall —
// the link carries a pseudonymous token in production. Two questions, ten seconds.

export default async function PulsePage({ searchParams }: PageProps<"/pulse">) {
  const sp = await searchParams;
  const service = typeof sp.service === "string" ? sp.service : "Sunday AM";

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-12 sm:py-16">
      <header className="rise mb-10 text-center">
        <Wordmark className="justify-center" />
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-brand">{service}</p>
        <h1 className="mt-3 font-display text-3xl text-ink text-balance sm:text-4xl">
          How was serving today?
        </h1>
        <p className="mt-3 text-ink-soft text-balance">
          Ten seconds, honest as you like. Your name never appears on the team view —
          only you and pastoral care ever see this.
        </p>
      </header>

      <PulseForm service={service} />

      <p className="mt-8 text-center text-xs text-ink-faint">
        Builds your own private serving journey. Skip any question, stop any time.
      </p>
    </main>
  );
}
