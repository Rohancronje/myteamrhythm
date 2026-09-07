"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResourceItem } from "@/lib/data/resources";

const inputCls = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none";
function pill(on: boolean) {
  return `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "text-white" : "text-mute"}`;
}

export function ResourcesView({ resources, canPost }: { resources: ResourceItem[]; canPost: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"link" | "pdf">("link");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    if (!title.trim()) { setMsg("Give it a title."); return; }
    if (kind === "link" && !/^https?:\/\//i.test(url)) { setMsg("Enter a link starting with https://"); return; }
    if (kind === "pdf" && !file) { setMsg("Choose a PDF to upload."); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.set("title", title); fd.set("detail", detail); fd.set("kind", kind);
      if (kind === "link") fd.set("url", url); else if (file) fd.set("file", file);
      const res = await fetch("/api/resources", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Couldn't add the resource.");
      setTitle(""); setDetail(""); setUrl(""); setFile(null); setOpen(false);
      router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm("Remove this resource?")) return;
    try { await fetch(`/api/resources/${id}`, { method: "DELETE" }); router.refresh(); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {canPost && (
        <section className="rise">
          <button onClick={() => setOpen((o) => !o)} className="w-full rounded-full grad-brand py-3 text-sm font-bold text-white">{open ? "Close" : "+ Add a resource"}</button>
          {open && (
            <div className="glass mt-3 space-y-2.5 rounded-2xl p-4">
              <div className="flex gap-2">
                <button onClick={() => setKind("link")} className={pill(kind === "link")} style={kind === "link" ? { background: "var(--grad-brand)", borderColor: "transparent" } : { borderColor: "var(--color-border)" }}>🔗 Link</button>
                <button onClick={() => setKind("pdf")} className={pill(kind === "pdf")} style={kind === "pdf" ? { background: "var(--grad-brand)", borderColor: "transparent" } : { borderColor: "var(--color-border)" }}>📄 PDF</button>
              </div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={inputCls} />
              {kind === "link" ? (
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" className={inputCls} />
              ) : (
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-mute file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text" />
              )}
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} placeholder="Description (optional)" className={`${inputCls} resize-none`} />
              <button onClick={add} disabled={busy} className="w-full rounded-full grad-brand py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Post resource"}</button>
              {msg && <p className="text-xs text-danger">{msg}</p>}
            </div>
          )}
        </section>
      )}

      {resources.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-8 text-center">
          <p className="font-display text-lg text-text">No resources yet.</p>
          <p className="mt-2 text-sm text-mute">{canPost ? "Add the first link or PDF above." : "Check back soon — your team's resources will show up here."}</p>
        </div>
      ) : (
        resources.map((r) => <ResourceCard key={r.id} r={r} canPost={canPost} onRemove={() => remove(r.id)} onRefresh={() => router.refresh()} />)
      )}
    </div>
  );
}

function ResourceCard({ r, canPost, onRemove, onRefresh }: { r: ResourceItem; canPost: boolean; onRemove: () => void; onRefresh: () => void }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/resources/${r.id}/comment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: comment }) });
      const data = await res.json();
      if (res.ok && data.ok) { setComment(""); onRefresh(); }
    } catch { /* ignore */ }
    setBusy(false);
  }

  const isPdf = r.kind === "pdf";
  return (
    <section className="rise glass rounded-[var(--radius-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: isPdf ? "rgba(255,92,138,0.16)" : "rgba(92,194,255,0.16)", color: isPdf ? "#ff5c8a" : "#5cc2ff" }}>{isPdf ? "PDF" : "LINK"}</span>
            <h2 className="truncate font-display text-base font-bold text-text">{r.title}</h2>
          </div>
          {r.detail && <p className="mt-1.5 text-sm text-mute">{r.detail}</p>}
          <p className="mt-1 text-[11px] text-faint">Added by {r.addedByName ?? "someone"}</p>
        </div>
        {canPost && <button onClick={onRemove} className="shrink-0 text-xs font-semibold text-danger transition-opacity hover:opacity-80">Remove</button>}
      </div>

      <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-full border border-border bg-surface-solid px-4 py-2 text-xs font-semibold text-text transition-colors hover:border-purple">
        {isPdf ? "⬇ Open PDF" : "↗ Open link"}
      </a>

      <div className="mt-4 border-t border-border pt-3">
        {r.comments.length > 0 && (
          <div className="mb-3 space-y-2">
            {r.comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-xs leading-relaxed text-text">{c.body}</p>
                <p className="mt-0.5 text-[10px] text-faint">— {c.authorName ?? "Someone"}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Add a comment…" className="flex-1 rounded-full border border-border bg-surface px-3.5 py-2 text-sm text-text placeholder:text-faint focus:border-purple focus:outline-none" />
          <button onClick={send} disabled={busy || !comment.trim()} className="shrink-0 rounded-full grad-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Post</button>
        </div>
      </div>
    </section>
  );
}
