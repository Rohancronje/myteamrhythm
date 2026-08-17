import { PulseForm } from "@/components/PulseForm";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";

export default async function PulsePage({ searchParams }: PageProps<"/pulse">) {
  const sp = await searchParams;
  const service = typeof sp.service === "string" ? sp.service : "today";

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-10">
      <header className="rise mb-8 text-center">
        <Wordmark className="justify-center" />
        <h1 className="mt-8 font-display text-3xl font-bold text-text text-balance">How was serving {service}?</h1>
        <p className="mt-2 text-mute text-balance">
          Under 20 seconds. Your answers are never shown to your team leader by name — that&apos;s the point.
        </p>
      </header>

      <PulseForm service={service} />

      <AppNav />
    </div>
  );
}
