"use client";

// Admin team list + create-team form. Each card links into the team editor where
// volunteers are added/imported and coaches assigned.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TeamSummary, CoachRef, PcoTeamOption } from "@/lib/data/teams-admin";

export function TeamsManager({ teams, coaches, pcoTeams }: { teams: TeamSummary[]; coaches: CoachRef[]; pcoTeams: PcoTeamOption[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("");
  const [pickedPco, setPickedPco] = useState<string[]>([]);
  const togglePco = (t: string) => setPickedPco((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(email: string) {
    setPicked((p) => (p.includes(email) ? p.filter((e) => e !== email) : [...p, email]));
  }

  async function create() {
    if (!name.trim()) { setErr("Give the team a name."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, campus, pcoTeams: pickedPco, coachEmails: picked }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Couldn't create the team.");
      setCreating(false); setName(""); setCampus(""); setPickedPco([]); setPicked([]);
      if (json.id) router.push(`/teams/${json.id}`);
      else router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="rise flex items-center justify-between gap-3">
        <p className="text-sm text-mute">{teams.length} {teams.length === 1 ? "team" : "teams"}</p>
        <div className="flex items-center gap-2">
          <Link href="/admin/users" className="rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-mute transition-colors hover:text-text">Accounts</Link>
          <Link href="/admin/coaches" className="rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-mute transition-colors hover:text-text">Coaches</Link>
          <button onClick={() => setCreating((c) => !c)} className="rounded-full grad-brand px-4 py-2 text-xs font-bold text-white">
            {creating ? "Close" : "+ Create team"}
          </button>
        </div>
      </div>

      {creating && (
        <div className="rise glass rounded-[var(--radius-card)] p-5">
          <h2 className="font-display text-lg font-bold text-text">New team</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-mute">Team name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NS Worship" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-mute">Campus <span className="text-faint">(optional)</span></span>
              <input value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="e.g. North Shore" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
            </label>
          </div>

          {pcoTeams.length > 0 && (
            <div className="mt-4">
              <span className="mb-2 block text-xs font-medium text-mute">Planning Center teams <span className="text-faint">(optional — pick any; imports their members)</span></span>
              <div className="flex flex-wrap gap-2">
                {pcoTeams.map((p) => {
                  const on = pickedPco.includes(p.team);
                  return (
                    <button type="button" key={p.team} onClick={() => togglePco(p.team)} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors" style={on ? { background: "var(--grad-brand)", color: "white", borderColor: "transparent" } : { borderColor: "var(--color-border)", color: "var(--color-mute)" }}>
                      {p.team} <span className="opacity-70">({p.count})</span>
                    </button>
                  );
                })}
              </div>
              {pickedPco.length > 0 && <p className="mt-2 text-[11px] text-faint">On create, everyone on {pickedPco.length} selected team{pickedPco.length === 1 ? "" : "s"} will be pulled in.</p>}
            </div>
          )}

          <div className="mt-4">
            <span className="mb-2 block text-xs font-medium text-mute">Assign coaches <span className="text-faint">(optional — can do later)</span></span>
            {coaches.length === 0 ? (
              <p className="text-xs text-faint">No coach accounts yet. <Link href="/admin/coaches" className="grad-text font-semibold">Invite one →</Link></p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {coaches.map((c) => {
                  const on = picked.includes(c.email);
                  return (
                    <button key={c.email} onClick={() => toggle(c.email)} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors" style={on ? { background: "var(--grad-brand)", color: "white", borderColor: "transparent" } : { borderColor: "var(--color-border)", color: "var(--color-mute)" }}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {err && <p className="mt-3 text-xs text-danger">{err}</p>}
          <button onClick={create} disabled={busy} className="mt-4 rounded-full grad-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
            {busy ? "Creating…" : "Create team"}
          </button>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No teams yet.</p>
          <p className="mt-2 text-sm text-mute">Create your first team, then add volunteers manually or import a CSV/Excel file.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {teams.map((t, i) => (
            <Link key={t.id} href={`/teams/${t.id}`} className="rise glass rounded-[var(--radius-card)] p-5 transition-transform active:scale-[0.99]" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-bold text-text">{t.name}</h2>
                  {t.campus && <p className="text-xs text-faint">{t.campus}</p>}
                </div>
                <span className="shrink-0 font-display text-2xl font-bold grad-text">{t.contactedPct}%</span>
              </div>
              <p className="mt-3 text-sm text-mute">{t.memberCount} {t.memberCount === 1 ? "volunteer" : "volunteers"} · connected this month</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.coaches.length === 0 ? (
                  <span className="rounded-full border border-dashed border-border-strong px-2.5 py-1 text-[11px] text-faint">No coach assigned</span>
                ) : (
                  t.coaches.map((c) => (
                    <span key={c.email} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-mute">{c.name}</span>
                  ))
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
