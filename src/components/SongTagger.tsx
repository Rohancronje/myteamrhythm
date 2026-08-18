"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { THEME_VOCAB, type TaggableSong, type TagStatus } from "@/lib/songs/tags-shared";

const STATUS_META: Record<TagStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "var(--color-faint)" },
  needs_review: { label: "Needs review", color: "var(--color-amber)" },
  tagged: { label: "Tagged", color: "var(--color-mint)" },
};

export function SongTagger({ songs }: { songs: TaggableSong[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return songs.filter((s) => !f || s.displayTitle.toLowerCase().includes(f));
  }, [songs, filter]);

  const counts = useMemo(() => ({
    tagged: songs.filter((s) => s.status === "tagged").length,
    review: songs.filter((s) => s.status === "needs_review").length,
    pending: songs.filter((s) => s.status === "pending").length,
  }), [songs]);

  return (
    <div>
      <div className="mb-4 flex gap-3 text-xs">
        <Stat n={counts.tagged} label="tagged" color="var(--color-mint)" />
        <Stat n={counts.review} label="needs review" color="var(--color-amber)" />
        <Stat n={counts.pending} label="pending" color="var(--color-faint)" />
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search songs…"
        className="mb-3 w-full rounded-xl border border-border bg-surface-solid px-4 py-2.5 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none"
      />

      <ul className="space-y-2">
        {filtered.map((s) => (
          <li key={s.title} className="glass overflow-hidden rounded-2xl">
            <button onClick={() => setOpenId(openId === s.title ? null : s.title)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[s.status].color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">{s.displayTitle}</span>
                <span className="block text-xs text-mute">
                  used {s.timesUsed}× {s.key ? `· key ${s.key}` : ""} {s.themes.length ? `· ${s.themes.length} themes` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs" style={{ color: STATUS_META[s.status].color }}>{STATUS_META[s.status].label}</span>
            </button>
            {openId === s.title && <Editor song={s} onSaved={() => { setOpenId(null); router.refresh(); }} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <strong className="font-display text-text">{n}</strong>
      <span className="text-mute">{label}</span>
    </span>
  );
}

function Editor({ song, onSaved }: { song: TaggableSong; onSaved: () => void }) {
  const [themes, setThemes] = useState<string[]>(song.themes);
  const [refsText, setRefsText] = useState(song.scriptureRefs.join(", "));
  const [notes, setNotes] = useState(song.notes);
  const [busy, setBusy] = useState(false);

  function toggle(t: string) {
    setThemes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  async function save(status: TagStatus) {
    setBusy(true);
    const scriptureRefs = refsText.split(",").map((r) => r.trim()).filter(Boolean);
    await fetch("/api/songs/tag", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: song.title, displayTitle: song.displayTitle, themes, scriptureRefs, status, notes }),
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="border-t border-border px-4 py-4">
      <p className="mb-2 text-xs font-medium text-mute">Themes (from the controlled list)</p>
      <div className="flex flex-wrap gap-1.5">
        {THEME_VOCAB.map((t) => {
          const on = themes.includes(t);
          return (
            <button key={t} onClick={() => toggle(t)} className="rounded-full border px-2.5 py-1 text-xs transition-all" style={{ borderColor: on ? "var(--color-purple)" : "var(--color-border)", background: on ? "color-mix(in srgb, var(--color-purple) 16%, transparent)" : "transparent", color: on ? "var(--color-text)" : "var(--color-mute)", fontWeight: on ? 600 : 400 }}>
              {on ? "✓ " : ""}{t}
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 mt-4 text-xs font-medium text-mute">Scripture references (comma-separated)</p>
      <input value={refsText} onChange={(e) => setRefsText(e.target.value)} placeholder="e.g. Isaiah 43:16-19, Psalm 23" className="w-full rounded-xl border border-border bg-surface-solid px-3 py-2 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none" />

      <p className="mb-1.5 mt-4 text-xs font-medium text-mute">Notes (optional)</p>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-border bg-surface-solid px-3 py-2 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none" />

      <a href={`https://songselect.ccli.com/search/results?SearchText=${encodeURIComponent(song.displayTitle)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-blue hover:underline">
        View lyrics on SongSelect ↗ (never stored here)
      </a>

      <div className="mt-4 flex gap-2">
        <button onClick={() => save("tagged")} disabled={busy} className="flex-1 rounded-full grad-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40">Save as tagged</button>
        <button onClick={() => save("needs_review")} disabled={busy} className="rounded-full border border-border px-4 py-2.5 text-sm font-medium text-amber">Needs review</button>
      </div>
    </div>
  );
}
