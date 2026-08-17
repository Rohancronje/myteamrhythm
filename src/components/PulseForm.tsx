"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

// Two dimensions, each a 1–5 scale with human anchors. Reads as a feeling, not a
// test. Posts to /api/pulse (pseudonymous) and lands on a warm thanks.

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
      /* optimistic thanks */
    }
    setState("done");
  }

  return (
    <AnimatePresence mode="wait">
      {state === "done" ? (
        <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--color-calm) 15%, white)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6 9 17l-5-5" stroke="var(--color-calm)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-display text-2xl text-ink">Thank you.</p>
          <p className="mt-2 text-ink-soft">That&apos;s logged. Rest well — you gave something today.</p>
          <Link href="/" className="mt-6 inline-block rounded-full border border-line px-5 py-2.5 text-sm font-medium text-brand hover:border-line-strong">
            Back to dashboard →
          </Link>
        </motion.div>
      ) : (
        <motion.div key="form" className="space-y-4">
          {QUESTIONS.map((q, qi) => (
            <div key={q.key} className="rise card p-5" style={{ animationDelay: `${qi * 70}ms` }}>
              <p className="font-display text-xl text-ink">{q.prompt}</p>
              <div className="mt-4 flex items-center gap-2">
                {SCALE.map((n) => {
                  const active = answers[q.key] === n;
                  return (
                    <button key={n} onClick={() => setAnswers((a) => ({ ...a, [q.key]: n }))} aria-label={`${n} of 5`} className="flex-1">
                      <span
                        className="flex h-12 items-center justify-center rounded-xl border text-base transition-all"
                        style={{
                          borderColor: active ? "var(--color-brand)" : "var(--color-line)",
                          background: active ? "var(--color-brand-soft)" : "var(--color-surface)",
                          color: active ? "var(--color-brand)" : "var(--color-ink-faint)",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-sm text-ink-faint">
                <span>{q.low}</span>
                <span>{q.high}</span>
              </div>
            </div>
          ))}

          <div className="rise card p-5" style={{ animationDelay: "160ms" }}>
            <label className="font-display text-xl text-ink" htmlFor="note">
              Anything on your heart? <span className="text-sm text-ink-faint">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Only pastoral care can ever read this — never the team dashboard."
              className="mt-3 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={!complete || state === "sending"}
            className="w-full rounded-full bg-ink py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-30"
          >
            {state === "sending" ? "Sending…" : complete ? "Send my check-in" : "Tap the two above to send"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
