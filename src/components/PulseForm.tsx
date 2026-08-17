"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

// Two dimensions, each a 1–5 scale with human anchors. We show it as a warm,
// tactile row of pips rather than numbers, so it reads as a feeling, not a test.
// Submitting posts to /api/pulse (pseudonymous) and lands on a warm thanks.

type Q = { key: "energy" | "meaning"; prompt: string; low: string; high: string };

const QUESTIONS: Q[] = [
  { key: "energy", prompt: "After serving, I feel…", low: "Drained", high: "Energised" },
  { key: "meaning", prompt: "Serving today felt like…", low: "An obligation", high: "Worship" },
];

const SCALE = [1, 2, 3, 4, 5];

export function PulseForm({ service }: { service: string }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const complete = QUESTIONS.every((q) => answers[q.key]);

  async function submit() {
    setState("sending");
    try {
      await fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service, ...answers, note }),
      });
    } catch {
      // Optimistic thanks: a failed network write should never make someone feel
      // their honesty was rejected.
    }
    setState("done");
  }

  return (
    <AnimatePresence mode="wait">
      {state === "done" ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[var(--radius-card)] p-9 text-center"
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "color-mix(in srgb, var(--color-zone-steady) 25%, transparent)",
              boxShadow: "0 0 40px -6px var(--color-zone-steady)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M20 6 9 17l-5-5" stroke="var(--color-zone-steady)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-display text-3xl text-cream">Thank you.</p>
          <p className="mt-3 text-cream-soft">
            That&apos;s logged. Rest well — you gave something today.
          </p>
          <Link
            href="/journey/mara"
            className="mt-7 inline-block rounded-full border border-line bg-card px-5 py-2.5 text-sm font-medium text-ember transition-colors hover:border-ember"
          >
            See your serving journey →
          </Link>
        </motion.div>
      ) : (
        <motion.div key="form" className="space-y-5">
          {QUESTIONS.map((q, qi) => (
            <div
              key={q.key}
              className="rise glass rounded-[var(--radius-card)] p-6"
              style={{ animationDelay: `${qi * 90}ms` }}
            >
              <p className="font-display text-2xl text-cream">{q.prompt}</p>
              <div className="mt-5 flex items-center gap-2.5">
                {SCALE.map((n) => {
                  const active = answers[q.key] === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: n }))}
                      aria-label={`${n} of 5`}
                      className="flex-1"
                    >
                      <span
                        className="flex h-14 items-center justify-center rounded-2xl border text-lg transition-all"
                        style={{
                          borderColor: active ? "var(--color-ember)" : "var(--color-line)",
                          background: active
                            ? "color-mix(in srgb, var(--color-ember) 16%, transparent)"
                            : "var(--color-night-2)",
                          color: active ? "var(--color-ember-bright)" : "var(--color-cream-faint)",
                          fontWeight: active ? 600 : 400,
                          transform: active ? "translateY(-3px)" : undefined,
                          boxShadow: active ? "0 10px 30px -12px var(--color-ember)" : undefined,
                        }}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between text-sm text-cream-faint">
                <span>{q.low}</span>
                <span>{q.high}</span>
              </div>
            </div>
          ))}

          <div className="rise glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "200ms" }}>
            <label className="font-display text-2xl text-cream" htmlFor="note">
              Anything on your heart?{" "}
              <span className="text-base text-cream-faint">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Only pastoral care can ever read this — never the team dashboard."
              className="mt-4 w-full resize-none rounded-2xl border border-line bg-night-2 px-4 py-3 text-cream placeholder:text-cream-faint focus:border-ember focus:outline-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={!complete || state === "sending"}
            className="w-full rounded-full bg-ember py-4 text-base font-semibold text-night transition-all enabled:hover:shadow-[0_0_40px_-8px_var(--color-ember)] disabled:opacity-35"
          >
            {state === "sending" ? "Sending…" : complete ? "Send my check-in" : "Tap the two above to send"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
