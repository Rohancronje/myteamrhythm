import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { NextService } from "@/components/NextService";
import { getSession } from "@/lib/auth/server";
import { getNextServiceForPerson, getNextServiceOverall } from "@/lib/data/upcoming";

export const dynamic = "force-dynamic";

export default async function NextPage() {
  const session = await getSession();
  const mine = await getNextServiceForPerson(session?.personId);
  const service = mine?.service ?? (await getNextServiceOverall());
  const personal = !!mine;

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <div>
          <Wordmark />
          <p className="mt-1.5 text-sm text-mute">{personal ? "Your next service" : "Next service"}</p>
        </div>
        <Link href="/pulse" className="rounded-full border border-border bg-surface-solid px-4 py-2 text-xs font-medium text-mute transition-colors hover:text-text">
          Check-in →
        </Link>
      </header>

      {service ? (
        <NextService service={service} myPosition={mine?.myPosition} personal={personal} />
      ) : (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">Nothing scheduled yet.</p>
          <p className="mt-2 text-sm text-mute">
            {session?.personId
              ? "You're not rostered on an upcoming service in the next few weeks."
              : "No upcoming services synced yet."}
          </p>
        </div>
      )}

      <AppNav />
    </div>
  );
}
