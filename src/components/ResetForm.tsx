"use client";

import { useState } from "react";
import Link from "next/link";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("Those passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error ?? "Couldn't reset your password."); setBusy(false); return; }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-mute">This reset link is missing or malformed. Request a new one from the sign-in page.</p>
        <Link href="/login" className="inline-block rounded-full grad-brand px-6 py-3 text-sm font-semibold text-white">Back to sign in</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="font-display text-lg text-text">Password updated 🎉</p>
        <p className="text-sm text-mute">You can now sign in with your new password.</p>
        <Link href="/login" className="inline-block rounded-full grad-brand px-6 py-3 text-sm font-semibold text-white">Sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="pw" className="mb-1.5 block text-xs font-medium text-mute">New password</label>
        <input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required
          className="w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none" placeholder="At least 8 characters" />
      </div>
      <div>
        <label htmlFor="pw2" className="mb-1.5 block text-xs font-medium text-mute">Confirm password</label>
        <input id="pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
          className="w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none" placeholder="Re-enter it" />
      </div>
      {error && <p className="rounded-lg border border-pink/40 bg-pink/10 px-3 py-2 text-sm text-pink">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-full grad-brand py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(139,108,255,0.9)] transition-opacity disabled:opacity-40">
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
