"use client";

// Admin: list every app account, add a person (with a role), reset any password,
// or remove an account. Passwords are set by the admin and shared with the person.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Account {
  email: string;
  name: string;
  role: string;
  teams: string[];
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "#ff5c8a" },
  coach: { label: "Coach", color: "#8b6cff" },
  leader: { label: "Leader", color: "#5cc2ff" },
  member: { label: "Member", color: "#38dd9b" },
};

function genPassword(): string {
  const words = ["rhythm", "connect", "north", "shore", "serve", "steady", "gather", "reach"];
  const w1 = words[Math.floor((Date.now() / 7) % words.length)];
  const w2 = words[Math.floor((Date.now() / 17) % words.length)];
  const n = 100 + Math.floor((Date.now() / 3) % 900);
  return `${w1}-${w2}-${n}`;
}

export function AccountsManager({ users }: { users: Account[] }) {
  return (
    <div className="space-y-4">
      <AddPerson />
      <div className="space-y-3">
        {users.map((u) => <AccountRow key={u.email} u={u} />)}
      </div>
    </div>
  );
}

function AddPerson() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("coach");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add(notify: boolean) {
    setMsg(null);
    if (!firstName || !lastName || !email || password.length < 8) {
      setMsg("First name, last name, email, and an 8+ char password are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/users/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName, lastName, phone, email, role, password, notify }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      const verb = data.existed ? "already had an account — password reset" : `added as ${ROLE_META[role]?.label ?? role}`;
      if (notify) {
        setMsg(data.emailed
          ? `✓ ${firstName} ${verb}; login emailed to ${email}.`
          : `✓ ${firstName} ${verb}, but the email didn't send${data.emailError ? ` (${data.emailError})` : ""}. Share the password: ${password}`);
      } else {
        setMsg(`✓ ${firstName} ${verb}. Share their password: ${password}`);
      }
      setFirstName(""); setLastName(""); setPhone(""); setEmail(""); setPassword(""); setRole("coach");
      router.refresh();
    } catch (e) {
      setMsg(`Couldn't add: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className="rise glass rounded-[var(--radius-card)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text">Add a person</h2>
          <p className="text-xs text-mute">Create an account and choose their role.</p>
        </div>
        <button onClick={() => { setOpen((o) => !o); setMsg(null); }} className="rounded-full grad-brand px-4 py-2 text-xs font-bold text-white">{open ? "Close" : "+ Add person"}</button>
      </div>

      {open && (
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_META).map(([key, m]) => {
              const on = role === key;
              return (
                <button key={key} onClick={() => setRole(key)} className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors" style={on ? { background: m.color, borderColor: "transparent", color: "#0a0912" } : { borderColor: "var(--color-border)", color: "var(--color-mute)" }}>
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Starting password (8+ chars)" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
            <button onClick={() => setPassword(genPassword())} className="shrink-0 rounded-lg border border-border px-3 text-xs font-semibold text-mute">Generate</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => add(false)} disabled={busy} className="rounded-full border border-border py-2.5 text-sm font-semibold text-text disabled:opacity-40">{busy ? "…" : "Add only"}</button>
            <button onClick={() => add(true)} disabled={busy} className="rounded-full grad-brand py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy ? "…" : "Add & email login"}</button>
          </div>
          {msg && <p className="break-words text-xs text-mute">{msg}</p>}
        </div>
      )}
    </div>
  );
}

function AccountRow({ u }: { u: Account }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const meta = ROLE_META[u.role] ?? { label: u.role, color: "var(--color-mute)" };

  async function reset(notify: boolean) {
    if (password.length < 8) { setMsg("Use at least 8 characters."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/users/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: u.email, password, notify }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      if (notify) {
        setMsg(data.emailed
          ? `✓ Password reset and emailed to ${u.email}.`
          : `✓ Password reset, but the email didn't send${data.emailError ? ` (${data.emailError})` : ""}. Share it manually: ${password}`);
      } else {
        setMsg(`✓ Password reset. Share it with ${u.name.split(" ")[0]}: ${password}`);
      }
    } catch (e) {
      setMsg(`Couldn't reset: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  async function changeRole(newRole: string) {
    if (newRole === u.role) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/users/role", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: u.email, role: newRole }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      setMsg(`✓ ${u.name.split(" ")[0]} is now ${ROLE_META[newRole]?.label ?? newRole}.`);
      router.refresh();
    } catch (e) {
      setMsg(`Couldn't change role: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Remove ${u.name}? Their account is deleted. Volunteers on their teams are not affected.`)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/users/remove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: u.email }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      router.refresh();
    } catch (e) {
      setMsg(`Couldn't remove: ${(e as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{u.name}</p>
          <p className="truncate text-xs text-mute">{u.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, transparent)` }}>{meta.label}</span>
          <button onClick={() => { setOpen((o) => !o); setMsg(null); }} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-mute">
            {open ? "Cancel" : "Manage"}
          </button>
          <button onClick={remove} disabled={busy} className="rounded-full px-2.5 py-1 text-xs font-semibold text-danger transition-opacity hover:opacity-80">Remove</button>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ chars)" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
            <button onClick={() => setPassword(genPassword())} className="shrink-0 rounded-lg border border-border px-3 text-xs font-semibold text-mute">Generate</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => reset(false)} disabled={busy} className="rounded-full border border-border py-2.5 text-sm font-semibold text-text disabled:opacity-40">
              {busy ? "…" : "Set only"}
            </button>
            <button onClick={() => reset(true)} disabled={busy} className="rounded-full grad-brand py-2.5 text-sm font-bold text-white disabled:opacity-40">
              {busy ? "…" : "Set & email"}
            </button>
          </div>

          {/* Role */}
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Role</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLE_META).map(([key, m]) => {
                const on = u.role === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeRole(key)}
                    disabled={busy || on}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default"
                    style={on ? { background: m.color, borderColor: "transparent", color: "#0a0912" } : { borderColor: "var(--color-border)", color: "var(--color-mute)" }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 break-words text-xs text-mute">{msg}</p>}
    </div>
  );
}
