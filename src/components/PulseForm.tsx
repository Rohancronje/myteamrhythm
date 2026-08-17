"use client";

// The four pulse questions (handover section 9). Under 20 seconds, no numeric
// scales — choices and words only. Q3 feeds an aggregated word cloud; Q4 feeds
// companionship data. Posts pseudonymously.

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

const Q1 = ["More energy", "About the same", "Less energy"];
const Q2 = ["More like worship", "More like work"];

export function PulseForm({ service }: { service: string }) {
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [thanks, setThanks] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const ready = q1 && q2;

  async function submit() {
    setState("sending");
    try {
      await fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service, energy: q1, worshipOrWork: q2, word, thanks }),
      });
    } catch {
      /* optimistic thanks */
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[var(--radius-card)] p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full grad-mint text-2xl">✓</div>
        <p className="font-display text-2xl font-bold text-text">Thank you.</p>
        <p className="mt-2 text-mute">That&apos;s logged. Rest well — you gave something today.</p>
        <Link href="/" className="mt-6 inline-block rounded-full border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-border-strong">
          Done
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <Card delay={0}>
        <p className="font-display text-lg font-semibold text-text">Compared to last time you served, how do you feel?</p>
        <Choices options={Q1} value={q1} onSelect={setQ1} />
      </Card>

      <Card delay={70}>
        <p className="font-display text-lg font-semibold text-text">Did today feel more like worship, or more like work?</p>
        <Choices options={Q2} value={q2} onSelect={setQ2} />
      </Card>

      <Card delay={140}>
        <p className="font-display text-lg font-semibold text-text">One word for how you&apos;re feeling right now</p>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value.slice(0, 24))}
          placeholder="e.g. full, tired, grateful"
          className="mt-3 w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none"
        />
        <p className="mt-2 text-xs text-faint">Feeds an anonymous word cloud — never tied to your name outside pastoral care.</p>
      </Card>

      <Card delay={210}>
        <p className="font-display text-lg font-semibold text-text">Anyone make today easier?</p>
        <input
          value={thanks}
          onChange={(e) => setThanks(e.target.value)}
          placeholder="Name a teammate to thank (optional)"
          className="mt-3 w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none"
        />
      </Card>

      <button
        onClick={submit}
        disabled={!ready || state === "sending"}
        className="w-full rounded-full grad-brand py-4 text-base font-semibold text-white transition-opacity disabled:opacity-30"
      >
        {state === "sending" ? "Sending…" : ready ? "Send my check-in" : "Answer the first two to send"}
      </button>
    </div>
  );
}

function Card({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <div className="rise glass rounded-[var(--radius-card)] p-5" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function Choices({ options, value, onSelect }: { options: string[]; value: string | null; onSelect: (v: string) => void }) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            onClick={() => onSelect(o)}
            className="rounded-xl border px-4 py-3 text-left text-[15px] transition-all"
            style={{
              borderColor: active ? "var(--color-purple)" : "var(--color-border)",
              background: active ? "color-mix(in srgb, var(--color-purple) 16%, transparent)" : "var(--color-surface-solid)",
              color: active ? "var(--color-text)" : "var(--color-mute)",
              fontWeight: active ? 600 : 400,
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
