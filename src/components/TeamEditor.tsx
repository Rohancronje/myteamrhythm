"use client";

// Manage one team: rename / set campus, assign coaches, and add/import/edit/remove
// volunteers. Contact details live on the volunteer record.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MemberImport } from "./MemberImport";
import type { TeamDetail, CoachRef, MemberRow, MemberInput, PcoTeamOption } from "@/lib/data/teams-admin";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Show a birthday as "6 Sep" — the stored year is irrelevant for birthdays. */
function formatBirthday(iso: string): string {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[2])} ${MONTHS[Number(m[1]) - 1]}` : iso;
}

export function TeamEditor({ team, allCoaches, pcoTeams }: { team: TeamDetail; allCoaches: CoachRef[]; pcoTeams: PcoTeamOption[] }) {
  const router = useRouter();
  const assigned = new Set(team.coaches.map((c) => c.email));
  const [picked, setPicked] = useState<string[]>([...assigned]);
  const [name, setName] = useState(team.name);
  const [campus, setCampus] = useState(team.campus ?? "");
  const [busy, setBusy] = useState(false);
  const [pcoTeam, setPcoTeam] = useState(team.pcoTeam ?? "");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncPco() {
    setSyncBusy(true); setSyncMsg(null);
    try {
      const res = await fetch(`/api/teams/${team.id}/sync`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pcoTeam: pcoTeam || null }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Sync failed");
      setSyncMsg(`✓ Synced with “${data.pcoTeam}” — ${data.added} added, ${data.removed} removed, ${data.kept} kept.`);
      router.refresh();
    } catch (e) {
      setSyncMsg(`Couldn't sync: ${(e as Error).message}`);
    }
    setSyncBusy(false);
  }

  const coachesDirty = picked.length !== assigned.size || picked.some((e) => !assigned.has(e));
  const teamDirty = name.trim() !== team.name || (campus.trim() || null) !== (team.campus ?? null);

  async function saveTeam() {
    setBusy(true);
    try {
      await fetch(`/api/teams/${team.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, campus }) });
      router.refresh();
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function saveCoaches() {
    setBusy(true);
    try {
      await fetch(`/api/teams/${team.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ coachEmails: picked }) });
      router.refresh();
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function archive() {
    if (!confirm(`Archive "${team.name}"? Its volunteers stay in the database but the team is hidden.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      router.push("/teams");
    } catch { setBusy(false); }
  }
  function toggle(email: string) {
    setPicked((p) => (p.includes(email) ? p.filter((e) => e !== email) : [...p, email]));
  }

  return (
    <div className="space-y-6">
      {/* Team identity */}
      <section className="rise glass rounded-[var(--radius-card)] p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-mute">Team name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-mute">Campus</span>
            <input value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="optional" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={archive} disabled={busy} className="text-xs font-semibold text-danger transition-opacity hover:opacity-80">Archive team</button>
          {teamDirty && <button onClick={saveTeam} disabled={busy} className="rounded-full grad-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Save changes</button>}
        </div>
      </section>

      {/* Coaches */}
      <section className="rise glass rounded-[var(--radius-card)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Coaches</h2>
          {coachesDirty && <button onClick={saveCoaches} disabled={busy} className="rounded-full grad-brand px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40">Save coaches</button>}
        </div>
        <p className="mt-1 text-xs text-mute">Assigned coaches see this team in their Connect workspace.</p>
        {allCoaches.length === 0 ? (
          <p className="mt-3 text-xs text-faint">No coach accounts yet. <Link href="/admin/coaches" className="grad-text font-semibold">Invite one →</Link></p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {allCoaches.map((c) => {
              const on = picked.includes(c.email);
              return (
                <button key={c.email} onClick={() => toggle(c.email)} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors" style={on ? { background: "var(--grad-brand)", color: "white", borderColor: "transparent" } : { borderColor: "var(--color-border)", color: "var(--color-mute)" }}>
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Planning Center sync */}
      <section className="rise glass rounded-[var(--radius-card)] p-5">
        <h2 className="text-sm font-semibold text-text">Planning Center</h2>
        <p className="mt-1 text-xs text-mute">Link this team to a Planning Center team, then sync to pull in new people and drop anyone taken off it.</p>
        {pcoTeams.length === 0 ? (
          <p className="mt-3 text-xs text-faint">No Planning Center teams found yet — run a roster sync first.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select value={pcoTeam} onChange={(e) => setPcoTeam(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text sm:flex-1">
              <option value="">Not linked</option>
              {pcoTeams.map((p) => <option key={p.team} value={p.team}>{p.team} ({p.count})</option>)}
            </select>
            <button onClick={syncPco} disabled={syncBusy || !pcoTeam} className="shrink-0 rounded-full grad-brand px-5 py-2 text-xs font-bold text-white disabled:opacity-40">
              {syncBusy ? "Syncing…" : "Sync with Planning Center"}
            </button>
          </div>
        )}
        {syncMsg && <p className="mt-2 break-words text-xs text-mute">{syncMsg}</p>}
      </section>

      {/* Import */}
      <MemberImport teamId={team.id} />

      {/* Members */}
      <section className="rise">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-text">Volunteers</h2>
          <span className="text-xs text-faint">{team.members.length} on this team</span>
        </div>
        <div className="glass overflow-hidden rounded-[var(--radius-card)]">
          <AddMemberRow teamId={team.id} />
          {team.members.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-mute">No volunteers yet. Add one above, or import a file.</p>
          ) : (
            <ul className="divide-y divide-border">
              {team.members.map((m) => <MemberLine key={m.id} m={m} />)}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function AddMemberRow({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [f, setF] = useState<MemberInput>({ name: "", email: "", phone: "", birthday: "", role: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof MemberInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function add() {
    if (!f.name?.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/teams/${teamId}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ members: [f] }) });
      setF({ name: "", email: "", phone: "", birthday: "", role: "" });
      router.refresh();
    } catch { /* ignore */ }
    setBusy(false);
  }

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-border bg-surface-solid p-3 lg:grid-cols-6">
      <input value={f.name ?? ""} onChange={set("name")} placeholder="Name *" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint lg:col-span-2" />
      <input value={f.email ?? ""} onChange={set("email")} placeholder="Email" inputMode="email" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint" />
      <input value={f.phone ?? ""} onChange={set("phone")} placeholder="Phone" inputMode="tel" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint" />
      <input value={f.role ?? ""} onChange={set("role")} placeholder="Role" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint" />
      <div className="flex gap-2">
        <input value={f.birthday ?? ""} onChange={set("birthday")} type="date" title="Birthday" className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text" />
        <button onClick={add} disabled={busy || !f.name?.trim()} className="shrink-0 rounded-lg grad-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Add</button>
      </div>
    </div>
  );
}

function MemberLine({ m }: { m: MemberRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<MemberInput>({ name: m.name, email: m.email ?? "", phone: m.phone ?? "", birthday: m.birthday ?? "", role: m.role ?? "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof MemberInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/members/${m.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
      setEditing(false);
      router.refresh();
    } catch { /* ignore */ }
    setBusy(false);
  }
  async function remove() {
    if (!confirm(`Remove ${m.name} from this team?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/members/${m.id}`, { method: "DELETE" });
      router.refresh();
    } catch { setBusy(false); }
  }

  if (editing) {
    return (
      <li className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-6">
        <input value={f.name ?? ""} onChange={set("name")} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text lg:col-span-2" />
        <input value={f.email ?? ""} onChange={set("email")} placeholder="Email" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint" />
        <input value={f.phone ?? ""} onChange={set("phone")} placeholder="Phone" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint" />
        <input value={f.role ?? ""} onChange={set("role")} placeholder="Role" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-faint" />
        <div className="flex gap-2">
          <input value={f.birthday ?? ""} onChange={set("birthday")} type="date" className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text" />
          <button onClick={save} disabled={busy} className="shrink-0 rounded-lg grad-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">Save</button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{m.name}{m.role ? <span className="ml-2 text-xs font-normal text-faint">{m.role}</span> : null}</p>
        <p className="truncate text-xs text-mute">
          {[m.email, m.phone].filter(Boolean).join(" · ") || "No contact details"}
          {m.birthday ? ` · 🎂 ${formatBirthday(m.birthday)}` : ""}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-mute transition-colors hover:text-text">Edit</button>
      <button onClick={remove} disabled={busy} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-danger transition-opacity hover:opacity-80">Remove</button>
    </li>
  );
}
