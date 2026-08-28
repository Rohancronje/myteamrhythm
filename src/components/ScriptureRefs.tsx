"use client";

// Collapsible, readable scripture references. Each ref is a chip; tapping it
// expands the actual passage text (WEB, public domain) inline and tapping again
// collapses it — turning the worship set into a readable devotional.

import { useState } from "react";

export function ScriptureRefs({ refs, draft }: { refs: string[]; draft?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(ref: string) {
    if (open === ref) {
      setOpen(null);
      return;
    }
    setOpen(ref);
    if (!text[ref]) {
      setLoading(ref);
      try {
        const res = await fetch(`/api/passage?ref=${encodeURIComponent(ref)}`);
        const data = await res.json();
        setText((t) => ({ ...t, [ref]: data.ok ? data.text : "Couldn't load this passage." }));
      } catch {
        setText((t) => ({ ...t, [ref]: "Couldn't load this passage." }));
      }
      setLoading(null);
    }
  }

  if (refs.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {refs.map((r) => {
          const isOpen = open === r;
          return (
            <button
              key={r}
              onClick={() => toggle(r)}
              className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] transition-colors"
              style={{
                borderColor: isOpen ? "var(--color-blue)" : "var(--color-border)",
                background: isOpen ? "color-mix(in srgb, var(--color-blue) 14%, transparent)" : "transparent",
                color: "var(--color-blue)",
              }}
            >
              📖 {r}
              <span className="text-[9px] opacity-70">{isOpen ? "▲" : "▼"}</span>
            </button>
          );
        })}
        {draft && <span className="text-[10px] text-faint" title="Auto-tagged, not yet reviewed by a person">unverified</span>}
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-surface-solid p-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue">{open}</p>
          {loading === open ? (
            <p className="text-xs text-faint">Loading…</p>
          ) : (
            <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-mute">{text[open]}</p>
          )}
          <p className="mt-2 text-[10px] text-faint">World English Bible (public domain)</p>
        </div>
      )}
    </div>
  );
}
