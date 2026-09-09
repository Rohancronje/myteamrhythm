import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { AppNav } from "@/components/AppNav";
import { AccountChip } from "@/components/AccountChip";
import { getSession } from "@/lib/auth/server";
import { isOwner } from "@/lib/auth/owner";
import { getAuditLog, type AuditEntry } from "@/lib/data/audit";

export const dynamic = "force-dynamic";

// Audit log — owner-only ("Admin+"). Ordinary admins can't reach it: the page
// redirects anyone who isn't a designated platform owner.
export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isOwner(session.email)) redirect("/connect");

  const entries = await getAuditLog(250);

  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-5 pb-28 pt-6">
      <header className="rise mb-6 flex items-center justify-between">
        <Link href="/connect" className="text-sm text-mute transition-colors hover:text-text">← Connect</Link>
        <Wordmark />
        <AccountChip />
      </header>

      <h1 className="rise mb-1 font-display text-2xl font-bold text-text">Audit log</h1>
      <p className="rise mb-6 text-sm text-mute">Owner-only. A record of account, role, team and volunteer changes.</p>

      {entries.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">Nothing logged yet.</p>
          <p className="mt-2 text-sm text-mute">Admin actions from here on will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => <Row key={e.id} e={e} />)}
        </ul>
      )}

      <AppNav />
    </div>
  );
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  "auth.login": { label: "Signed in", color: "#5cc2ff" },
  "auth.login_failed": { label: "Failed sign-in", color: "#ffb454" },
  "auth.reset_requested": { label: "Reset link requested", color: "#8b6cff" },
  "auth.reset_completed": { label: "Password reset (self-service)", color: "#5cc2ff" },
  "account.create": { label: "Account created", color: "#34d399" },
  "account.reset": { label: "Password reset", color: "#5cc2ff" },
  "role.change": { label: "Role changed", color: "#8b6cff" },
  "account.remove": { label: "Account removed", color: "#ff5c6a" },
  "coach.add": { label: "Coach added", color: "#34d399" },
  "coach.reset": { label: "Coach password reset", color: "#5cc2ff" },
  "coach.remove": { label: "Coach removed", color: "#ff5c6a" },
  "team.create": { label: "Team created", color: "#34d399" },
  "team.sync": { label: "Synced with Planning Center", color: "#5cc2ff" },
  "event.create": { label: "Event posted", color: "#34d399" },
  "event.remove": { label: "Event removed", color: "#ff5c6a" },
  "permissions.change": { label: "Permissions changed", color: "#8b6cff" },
  "resource.add": { label: "Resource added", color: "#34d399" },
  "resource.remove": { label: "Resource removed", color: "#ff5c6a" },
  "member.remove": { label: "Volunteer removed", color: "#ff5c6a" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Row({ e }: { e: AuditEntry }) {
  const meta = ACTION_META[e.action] ?? { label: e.action, color: "var(--color-mute)" };
  return (
    <li className="glass rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: `color-mix(in srgb, ${meta.color} 18%, transparent)`, color: meta.color }}>{meta.label}</span>
        <span className="shrink-0 text-[11px] text-faint">{fmt(e.at)}</span>
      </div>
      {e.detail && <p className="mt-1.5 text-sm text-text">{e.detail}</p>}
      <p className="mt-1 text-[11px] text-mute">
        {e.actorName || e.actorEmail || "System"}
        {e.target ? <span className="text-faint"> → {e.target}</span> : null}
      </p>
    </li>
  );
}
