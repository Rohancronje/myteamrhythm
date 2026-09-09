"use client";

// Admin view: list coaches with their teams + cycle progress, and invite a new
// coach (email + name + teams + a starting password the admin shares with them).

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Coach {
  email: string;
  name: string;
  phone: string | null;
  teams: string[];
  total: number;
  contactedPct: number;
}

interface Candidate {
  name: string;
  email: string;
  phone: string | null;
  teams: string[];
}

function genPassword(): string {
  // Readable, shareable starting password (admin hands it to the coach).
  const words = ["rhythm", "connect", "north", "shore", "serve", "coach", "team", "reach"];
  const w1 = words[Math.floor((Date.now() / 7) % words.length)];
  const w2 = words[Math.floor((Date.now() / 13) % words.length)];
  const n = 100 + Math.floor((Date.now() / 3) % 900);
  return `${w1}-${w2}-${n}`;
}

export function CoachManager({ coaches, candidates }: { coaches: Coach[]; candidates: Candidate[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [prefillNote, setPrefillNote] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const matches = q
    ? candidates.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 8)
    : [];

  // Prefill the form from an existing volunteer — the admin reviews, then sends the invite.
  function prefillFrom(c: Candidate) {
    const parts = c.name.trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
    setPhone(c.phone ?? "");
    setEmail(c.email);
    setPassword(genPassword());
    setSearch("");
    setMsg(null);
    setPrefillNote(`Prefilled from ${c.name}${c.teams.length ? ` · ${c.teams.join(" · ")}` : ""}. Review and send the invite.`);
  }

  async function save() {
    setMsg(null);
    if (!firstName || !lastName || !email || password.length < 8) {
      setMsg("First name, last name, email, and an 8+ char password are all required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/coaches/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName, lastName, phone, email, password }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      setMsg(
        data.emailed
          ? `✓ Invite emailed to ${email}. Assign them to teams from the Teams page.`
          : `✓ ${email} added — but the invite email didn't send${data.emailError ? ` (${data.emailError})` : ""}. Share the password with them directly.`,
      );
      setFirstName(""); setLastName(""); setPhone(""); setEmail(""); setPassword(""); setPrefillNote(null);
      router.refresh();
    } catch (e) {
      setMsg(`Couldn't save: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  async function remove(coachEmail: string, coachName: string) {
    if (!confirm(`Remove ${coachName}? Their account and team assignments are deleted. Volunteers are not affected.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/coaches/remove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: coachEmail }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      router.refresh();
    } catch (e) {
      setMsg(`Couldn't remove: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-7">
      {/* Existing coaches */}
      {coaches.length > 0 && (
        <section className="space-y-3">
          {coaches.map((c) => (
            <div key={c.email} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-text">{c.name}</p>
                  <p className="truncate text-xs text-mute">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-display text-lg font-bold grad-text">{c.contactedPct}%</span>
                  <button onClick={() => remove(c.email, c.name)} disabled={busy} className="rounded-lg px-3 py-2 text-xs font-semibold text-danger transition-opacity hover:opacity-80">Remove</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {c.teams.length === 0 ? (
                  <span className="rounded-md border border-dashed border-border-strong px-2 py-0.5 text-[11px] text-faint">No teams yet</span>
                ) : (
                  c.teams.map((t) => (
                    <span key={t} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-blue">{t}</span>
                  ))
                )}
                <span className="text-[11px] text-faint">· {c.total} people</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Add / assign a coach */}
      <section className="glass rounded-[var(--radius-card)] p-5">
        <h2 className="mb-1 font-display text-base font-bold text-text">Add a coach</h2>
        <p className="mb-4 text-xs text-mute">Assign someone already in the system, or enter a new person. Either way they get an emailed invite with their sign-in.</p>

        {/* Assign an existing volunteer */}
        {candidates.length > 0 && (
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">Assign an existing person</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search volunteers by name or email…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint"
            />
            {matches.length > 0 && (
              <div className="mt-1.5 overflow-hidden rounded-lg border border-border">
                {matches.map((c) => (
                  <button
                    key={c.email}
                    onClick={() => prefillFrom(c)}
                    className="flex w-full items-center justify-between gap-2 border-b border-border bg-surface-solid px-3 py-2 text-left last:border-b-0 hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text">{c.name}</span>
                      <span className="block truncate text-[11px] text-mute">{c.email}{c.teams.length ? ` · ${c.teams.join(" · ")}` : ""}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold grad-text">Use →</span>
                  </button>
                ))}
              </div>
            )}
            {q && matches.length === 0 && <p className="mt-1.5 text-[11px] text-faint">No matching volunteers without a login.</p>}
            <div className="mt-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-faint">or enter details</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" inputMode="email" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
          {prefillNote && <p className="text-[11px] font-medium text-blue">{prefillNote}</p>}
          <p className="pt-1 text-[11px] text-faint">You&apos;ll assign them to teams from the Teams page after inviting.</p>

          <div className="flex gap-2 pt-1">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Starting password" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-faint" />
            <button onClick={() => setPassword(genPassword())} className="shrink-0 rounded-lg border border-border px-3 text-xs font-semibold text-mute">Generate</button>
          </div>

          <button onClick={save} disabled={busy} className="mt-1 w-full rounded-full grad-brand py-3 text-sm font-bold text-white disabled:opacity-40">
            {busy ? "Saving…" : "Add coach"}
          </button>
          {msg && <p className="text-xs text-mute">{msg}</p>}
        </div>
      </section>
    </div>
  );
}
