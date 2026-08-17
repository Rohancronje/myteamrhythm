import { PulseForm } from "@/components/PulseForm";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { getUpcoming, getNextServiceOverall, serviceLabel } from "@/lib/data/upcoming";

export const dynamic = "force-dynamic";

// Post-service pulse. The link can carry ?plan=<id> (the service just served) so
// Q4 offers that exact roster; otherwise we fall back to the nearest service's
// team as a stand-in list.
export default async function PulsePage({ searchParams }: PageProps<"/pulse">) {
  const sp = await searchParams;
  const plan = typeof sp.plan === "string" ? sp.plan : undefined;

  const upcoming = await getUpcoming();
  const svc = (plan && upcoming.find((s) => s.planId === plan)) || (await getNextServiceOverall());
  const service = typeof sp.service === "string" ? sp.service : svc ? serviceLabel(svc.serviceType) : "today";
  const teammates = svc ? [...new Set(svc.roster.map((r) => r.name).filter(Boolean))] : [];

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-10">
      <header className="rise mb-8 text-center">
        <Wordmark className="justify-center" />
        <h1 className="mt-8 font-display text-3xl font-bold text-text text-balance">How was serving {service}?</h1>
        <p className="mt-2 text-mute text-balance">
          Under 20 seconds. Your answers are never shown to your team leader by name — that&apos;s the point.
        </p>
      </header>

      <PulseForm service={service} teammates={teammates} />

      <AppNav />
    </div>
  );
}
