import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { NextService } from "@/components/NextService";
import { getSession } from "@/lib/auth/server";
import { getNextServiceForPerson, getNextServiceOverall } from "@/lib/data/upcoming";
import { getThanksFor } from "@/lib/data/thanks";
import { getSongScriptureMap } from "@/lib/data/songscripture";

export const dynamic = "force-dynamic";

export default async function NextPage() {
  const session = await getSession();
  // Independent reads — run them together instead of one-after-another.
  const [mine, thanks, scriptureMap] = await Promise.all([
    getNextServiceForPerson(session?.personId),
    getThanksFor(session?.personId),
    getSongScriptureMap(),
  ]);
  const service = mine?.service ?? (await getNextServiceOverall());
  const personal = !!mine;
  const scriptureByTitle = Object.fromEntries(scriptureMap);

  return (
    <div className="mx-auto min-h-full w-full max-w-xl px-5 pb-28 pt-6">
      <header className="rise mb-5 flex items-center justify-between">
        <Wordmark />
        <AccountChip />
      </header>

      <h1 className="rise mb-5 font-display text-2xl font-bold text-text">{personal ? "Your next service" : "Next service"}</h1>

      {thanks.count > 0 && (
        <section className="rise mb-4 overflow-hidden rounded-[var(--radius-card)] p-5" style={{ background: "linear-gradient(135deg, rgba(56,221,155,0.16), rgba(92,194,255,0.1))", border: "1px solid rgba(56,221,155,0.3)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-mint">You were thanked 🙌</p>
          {thanks.named.slice(0, 2).map((t, i) => (
            <p key={i} className="mt-2 text-[15px] text-text">
              <span className="font-semibold">{t.senderName}</span> said you made {t.service ?? "serving"} easier.
            </p>
          ))}
          {thanks.anonymous > 0 && (
            <p className="mt-2 text-sm text-mute">
              {thanks.named.length > 0 ? "And " : ""}{thanks.anonymous} {thanks.anonymous === 1 ? "teammate" : "teammates"} said you helped, too.
            </p>
          )}
        </section>
      )}

      {service ? (
        <NextService service={service} myPosition={mine?.myPosition} personal={personal} scriptureByTitle={scriptureByTitle} />
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
