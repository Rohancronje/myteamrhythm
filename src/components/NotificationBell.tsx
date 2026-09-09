// Server wrapper: a header bell linking to /notifications, with an unread badge.
// Only coaches/admins receive notifications, so it renders null for everyone else.
// Drop it into a page header next to <AccountChip/>.
import Link from "next/link";
import { getSession } from "@/lib/auth/server";
import { unreadCount } from "@/lib/data/notifications";

export async function NotificationBell() {
  const session = await getSession();
  if (!session || (session.role !== "coach" && session.role !== "admin")) return null;
  const n = await unreadCount(session.email);
  return (
    <Link
      href="/notifications"
      aria-label={n > 0 ? `Notifications, ${n} unread` : "Notifications"}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-solid text-text transition-colors hover:bg-white/[0.06]"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {n > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
          style={{ background: "var(--grad-brand)" }}
        >
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}
