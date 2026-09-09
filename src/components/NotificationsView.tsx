"use client";

// The notifications list. Opening the page clears the unread badge (marks all read
// on mount) but keeps the unread dots visible for this view, so you can still see
// what was new. Each notification links to where it came from.
import { useEffect } from "react";
import Link from "next/link";
import type { NotificationRow } from "@/lib/data/notifications";

function relTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export function NotificationsView({ initial }: { initial: NotificationRow[] }) {
  useEffect(() => {
    // Opening the page clears the unread badge for next time.
    fetch("/api/connect/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => { /* best effort */ });
  }, []);

  if (initial.length === 0) {
    return (
      <div className="glass rounded-[var(--radius-card)] p-8 text-center">
        <p className="font-display text-lg text-text">No notifications yet 🔔</p>
        <p className="mt-2 text-sm text-mute">Reminders you set on a contact&rsquo;s profile will show up here on the day.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {initial.map((n) => {
        const inner = (
          <div className="flex items-start gap-3">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: n.read ? "transparent" : "var(--grad-brand)" }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text">{n.title}</span>
              {n.body && <span className="mt-0.5 block truncate text-xs text-mute">{n.body}</span>}
              <span className="mt-1 block text-[11px] text-faint">{relTime(n.createdAt)}{n.href ? " · View contact →" : ""}</span>
            </span>
          </div>
        );
        return (
          <li key={n.id} className="glass rounded-2xl p-4">
            {n.href ? <Link href={n.href}>{inner}</Link> : inner}
          </li>
        );
      })}
    </ul>
  );
}
