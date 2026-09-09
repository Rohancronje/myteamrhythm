"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventItem } from "@/lib/data/events";

export function UpcomingEvents({ events, canPost }: { events: EventItem[]; canPost: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    if (!title.trim() || !eventDate) { setMsg("Give it a title and a date."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, eventDate, eventTime, location, detail }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Couldn't add the event.");
      setTitle(""); setEventDate(""); setEventTime(""); setLocation(""); setDetail(""); setOpen(false);
      router.refresh();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm("Remove this event?")) return;
    try { await fetch(`/api/events/${id}`, { method: "DELETE" }); router.refresh(); } catch { /* ignore */ }
  }

  return (
    <section className="rise mt-7" style={{ animationDelay: "30ms" }}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-mute">What&apos;s coming up</h2>
        {canPost && <button onClick={() => setOpen((o) => !o)} className="grad-text text-xs font-semibold">{open ? "Close" : "+ Add event"}</button>}
      </div>

      {open && canPost && (
        <div className="glass mb-3 space-y-2.5 rounded-2xl p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="date" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
            <input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="Time e.g. 6:30pm" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} placeholder="Details (optional)" className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-faint" />
          <button onClick={add} disabled={busy} className="w-full rounded-full grad-brand py-2.5 text-sm font-bold text-white disabled:opacity-40">{busy ? "Adding…" : "Add event"}</button>
          {msg && <p className="text-xs text-danger">{msg}</p>}
        </div>
      )}

      {events.length === 0 ? (
        <div className="glass rounded-[var(--radius-card)] p-5 text-sm text-mute">Nothing scheduled yet.{canPost ? " Add the first event above." : ""}</div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{e.title}</p>
                  <p className="mt-0.5 text-xs grad-text font-semibold">{e.dateLabel}{e.eventTime ? ` · ${e.eventTime}` : ""}</p>
                  {e.location && <p className="mt-0.5 text-xs text-mute">📍 {e.location}</p>}
                  {e.detail && <p className="mt-1.5 text-xs text-mute">{e.detail}</p>}
                </div>
                {canPost && <button onClick={() => remove(e.id)} className="-my-1 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger transition-opacity hover:opacity-80">Remove</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
