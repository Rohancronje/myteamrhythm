"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

// The four pulse questions (handover section 9), under 20 seconds.
// - progress feedback (X of 4) for momentum on the time promise
// - Q4 is a tappable list of the day's ACTUAL roster (not free text), so it feeds
//   the companionship graph cleanly — no typos, structured names.

const Q1 = ["More energy", "About the same", "Less energy"];
const Q2 = ["More like worship", "More like work"];

export function PulseForm({ service, teammates }: { service: string; teammates: string[] }) {
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [thanks, setThanks] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const ready = q1 && q2;
  const answered = [q1, q2, word.trim(), thanks.length ? "y" : ""].filter(Boolean).length;

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return teammates.filter((t) => !f || t.toLowerCase().includes(f)).slice(0, 24);
  }, [teammates, filter]);

  function toggleThanks(name: string) {
    setThanks((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  async function submit() {
    setState("sending");
    try {
      await fetch("/api/pulse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service, energy: q1, worshipOrWork: q2, word, thanks: thanks.join(", ") }),
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
        {thanks.length > 0 && <p className="mt-2 text-sm text-mint">{thanks.join(" and ")} will know they helped.</p>}
        <Link href="/next" className="mt-6 inline-block rounded-full border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-border-strong">
          Done
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="sticky top-0 z-10 -mx-1 rounded-full bg-[#0a0912]/70 px-1 py-2 backdrop-blur">
        <div className="flex items-center justify-between px-1 pb-1.5 text-xs text-mute">
          <span>Under 20 seconds</span>
          <span className="font-semibold text-text">{answered} of 4</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-solid">
          <div className="h-full rounded-full grad-brand transition-[width] duration-300" style={{ width: `${(answered / 4) * 100}%` }} />
        </div>
      </div>

      <Card n={1}>
        <p className="font-display text-lg font-semibold text-text">Compared to last time you served, how do you feel?</p>
        <Choices options={Q1} value={q1} onSelect={setQ1} />
      </Card>

      <Card n={2}>
        <p className="font-display text-lg font-semibold text-text">Did today feel more like worship, or more like work?</p>
        <Choices options={Q2} value={q2} onSelect={setQ2} />
      </Card>

      <Card n={3}>
        <p className="font-display text-lg font-semibold text-text">One word for how you&apos;re feeling right now</p>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value.slice(0, 24))}
          placeholder="e.g. full, tired, grateful"
          className="mt-3 w-full rounded-xl border border-border bg-surface-solid px-4 py-3 text-text placeholder:text-faint focus:border-purple focus:outline-none"
        />
        <p className="mt-2 text-xs text-faint">Anonymous word cloud — never tied to your name outside pastoral care.</p>
      </Card>

      <Card n={4}>
        <p className="font-display text-lg font-semibold text-text">Anyone make today easier?</p>
        <p className="mt-1 text-xs text-mute">Tap anyone from today&apos;s team to thank them.</p>
        {teammates.length > 8 && (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search the team…"
            className="mt-3 w-full rounded-xl border border-border bg-surface-solid px-4 py-2.5 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none"
          />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {filtered.map((name) => {
            const on = thanks.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleThanks(name)}
                className="rounded-full border px-3 py-1.5 text-sm transition-all"
                style={{
                  borderColor: on ? "var(--color-mint)" : "var(--color-border)",
                  background: on ? "color-mix(in srgb, var(--color-mint) 18%, transparent)" : "var(--color-surface-solid)",
                  color: on ? "var(--color-text)" : "var(--color-mute)",
                  fontWeight: on ? 600 : 400,
                }}
              >
                {on ? "✓ " : ""}{name}
              </button>
            );
          })}
          {teammates.length === 0 && <p className="text-sm text-faint">No roster for this service yet.</p>}
        </div>
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

function Card({ children, n }: { children: React.ReactNode; n: number }) {
  return (
    <div className="rise glass relative rounded-[var(--radius-card)] p-5" style={{ animationDelay: `${n * 60}ms` }}>
      <span className="absolute right-4 top-4 font-display text-xs font-bold text-faint">{n}/4</span>
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
