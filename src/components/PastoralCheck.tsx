"use client";

// Pastoral follow-up — structured tick boxes, never free-text notes. An admin can
// record that they reached out / checked in, and the broad outcome. Saves on each
// tap. Nothing here is ever shown to the person themselves.

import { useState } from "react";

type Outcome = "all_well" | "needs_support" | null;

interface Initial {
  reachedOut: boolean;
  checkedIn: boolean;
  outcome: Outcome;
  updatedBy: string | null;
  updatedAt: string | null;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" }).format(d);
}

export function PastoralCheck({ pcoId, initial }: { pcoId: string; initial: Initial }) {
  const [reachedOut, setReachedOut] = useState(initial.reachedOut);
  const [checkedIn, setCheckedIn] = useState(initial.checkedIn);
  const [outcome, setOutcome] = useState<Outcome>(initial.outcome);
  const [by, setBy] = useState(initial.updatedBy);
  const [at, setAt] = useState(initial.updatedAt);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(next: { reachedOut: boolean; checkedIn: boolean; outcome: Outcome }) {
    setStatus("saving");
    try {
      const res = await fetch("/api/pastoral/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pcoId, ...next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "failed");
      setBy(data.updatedBy ?? by);
      setAt(new Date().toISOString());
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  function toggleReached() {
    const v = !reachedOut;
    setReachedOut(v);
    save({ reachedOut: v, checkedIn, outcome });
  }
  function toggleChecked() {
    const v = !checkedIn;
    setCheckedIn(v);
    save({ reachedOut, checkedIn: v, outcome });
  }
  function pickOutcome(o: Exclude<Outcome, null>) {
    const v: Outcome = outcome === o ? null : o;
    setOutcome(v);
    save({ reachedOut, checkedIn, outcome: v });
  }

  return (
    <section className="rise mt-4 rounded-[var(--radius-card)] border border-dashed border-border-strong p-6" style={{ animationDelay: "200ms" }}>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-medium text-text">Pastoral follow-up</h2>
        <span className="text-[11px] text-faint">
          {status === "saving" ? "Saving…" : status === "error" ? "Couldn’t save" : status === "saved" ? "Saved ✓" : ""}
        </span>
      </div>
      <p className="mb-4 text-xs text-mute">Just ticks — no notes are recorded about anyone.</p>

      {/* Contact */}
      <div className="space-y-2">
        <CheckRow label="Reached out" checked={reachedOut} onToggle={toggleReached} />
        <CheckRow label="Checked in" checked={checkedIn} onToggle={toggleChecked} />
      </div>

      {/* Outcome */}
      <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Outcome</p>
      <div className="flex gap-2.5">
        <OutcomePill
          label="All is well"
          active={outcome === "all_well"}
          color="var(--color-mint)"
          onClick={() => pickOutcome("all_well")}
        />
        <OutcomePill
          label="Further support needed"
          active={outcome === "needs_support"}
          color="var(--color-amber)"
          onClick={() => pickOutcome("needs_support")}
        />
      </div>

      {by && at && (
        <p className="mt-4 text-[11px] text-faint">Last updated by {by} · {fmtWhen(at)}</p>
      )}
    </section>
  );
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-solid px-4 py-3 text-left transition-colors"
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
        style={{
          borderColor: checked ? "var(--color-mint)" : "var(--color-border-strong)",
          background: checked ? "var(--color-mint)" : "transparent",
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#04231a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 6.5" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium text-text">{label}</span>
    </button>
  );
}

function OutcomePill({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-full border px-3 py-2.5 text-center text-xs font-semibold transition-colors"
      style={{
        borderColor: active ? color : "var(--color-border)",
        background: active ? `color-mix(in srgb, ${color} 18%, transparent)` : "transparent",
        color: active ? color : "var(--color-mute)",
      }}
    >
      {label}
    </button>
  );
}
