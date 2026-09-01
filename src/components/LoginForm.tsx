"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function sendReset() {
    setForgotBusy(true);
    try {
      await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: forgotEmail }) });
    } catch { /* generic success either way */ }
    setForgotSent(true);
    setForgotBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sign-in failed");
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-mute">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none"
          placeholder="you@church.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-mute">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-pink/40 bg-pink/10 px-3 py-2 text-sm text-pink">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full grad-brand py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_rgba(139,108,255,0.9)] transition-opacity disabled:opacity-40"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <div className="pt-1 text-center">
        <button type="button" onClick={() => { setForgot((f) => !f); setForgotSent(false); setForgotEmail((v) => v || email); }} className="text-xs text-mute underline-offset-2 hover:text-text hover:underline">
          Forgot password?
        </button>
      </div>
      {forgot && (
        forgotSent ? (
          <div className="rounded-xl border border-border bg-surface-solid px-4 py-3 text-xs leading-relaxed text-mute">
            If <span className="text-text">{forgotEmail || "that email"}</span> has an account, a reset link is on its way. Check your inbox (and spam) — it expires in 1 hour.
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-border bg-surface-solid px-4 py-3">
            <p className="text-xs text-mute">Enter your email and we&apos;ll send you a reset link.</p>
            <input
              type="email"
              autoComplete="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@church.com"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none"
            />
            <button type="button" onClick={sendReset} disabled={forgotBusy || !forgotEmail} className="w-full rounded-full border border-border py-2 text-xs font-semibold text-text disabled:opacity-40">
              {forgotBusy ? "Sending…" : "Send reset link"}
            </button>
          </div>
        )
      )}
    </form>
  );
}
