"use client";

// Role-scoped navigation. On phones it's a fixed bottom tab bar (native-app
// convention, handover section 2); on large screens it becomes a fixed left
// sidebar so the app reads as a proper desktop layout. Items come from the server
// via AppNav.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { NavItem } from "@/lib/auth/access";
import type { Attention } from "@/lib/data/attention";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", coach: "Coach", leader: "Leader", pastor: "Pastor", member: "Member" };

export function BottomNav({ items, user, attention }: { items: NavItem[]; user?: { name: string; role: string }; attention?: Attention | null }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-[#0b0a14]/70 backdrop-blur-2xl backdrop-saturate-150 lg:inset-y-0 lg:right-auto lg:left-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-t-0">
      {/* Brand — desktop sidebar only */}
      <div className="hidden lg:block px-4 pb-3 pt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Rhythm — Church Volunteer Platform" className="mx-auto block w-48" />
      </div>

      <div className="mx-auto flex max-w-xl items-stretch justify-around px-0.5 py-2 lg:mx-0 lg:max-w-none lg:flex-col lg:items-stretch lg:justify-start lg:gap-1 lg:px-3 lg:py-2">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path === it.href || path.startsWith(it.href + "/");
          return (
            <Link
              key={it.href + it.label}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] transition-colors lg:flex-none lg:flex-row lg:items-center lg:gap-3.5 lg:px-3.5 lg:py-2.5 lg:text-[13px] lg:font-medium ${active ? "lg:bg-white/[0.06]" : "lg:hover:bg-white/[0.03]"}`}
              style={{ color: active ? "var(--color-text)" : "var(--color-faint)" }}
            >
              <Icon name={it.icon} active={active} />
              {it.label}
            </Link>
          );
        })}
      </div>

      {/* At-a-glance care count — desktop sidebar only. Fills the rail with the
          one number that matters and links straight to the list. */}
      {attention && (
        <div className="hidden lg:block px-3 pb-1 pt-2">
          <Link
            href={attention.href}
            className="block rounded-2xl border border-border bg-white/[0.03] px-4 py-3.5 transition-colors hover:bg-white/[0.06]"
          >
            {attention.count > 0 ? (
              <>
                <span className="font-display text-3xl font-bold leading-none grad-text">{attention.count}</span>
                <span className="mt-1.5 block text-[12px] leading-snug text-mute">{attention.label}</span>
                <span className="mt-2 block text-[11px] font-semibold grad-text">Open →</span>
              </>
            ) : (
              <span className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(52,211,153,0.16)", color: "#34d399" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
                </span>
                <span className="text-[12px] font-medium text-mute">All caught up</span>
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Account footer — desktop sidebar only */}
      {user && (
        <div className="hidden lg:mt-auto lg:block border-t border-border px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full grad-brand font-display text-[11px] font-bold text-white">
              {user.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-text">{user.name}</span>
              <span className="block truncate text-[11px] text-faint">{ROLE_LABEL[user.role] ?? user.role}</span>
            </span>
            <button onClick={logout} title="Sign out" className="shrink-0 rounded-lg p-1.5 text-faint transition-colors hover:bg-white/[0.06] hover:text-text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function Icon({ name, active }: { name: NavItem["icon"]; active: boolean }) {
  const stroke = active
    ? { home: "url(#g1)", teams: "#ff5c8a", songs: "#8b6cff", check: "#34d399", insights: "#5cc2ff", me: "url(#g1)", next: "#ffb454", today: "#34d399", connect: "url(#g1)", birthday: "#ff5c8a", resources: "#5cc2ff" }[name]
    : "currentColor";
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" as const };
  switch (name) {
    case "today":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5z" strokeLinejoin="round" />
        </svg>
      );
    case "next":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8">
          <rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" strokeLinecap="round" /><path d="M12 12.5v3l2 1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
          <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8b6cff" /><stop offset="1" stopColor="#ff5c8a" /></linearGradient></defs>
        </svg>
      );
    case "me":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.4" stroke={stroke} strokeWidth="1.8" />
          <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
          <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8b6cff" /><stop offset="1" stopColor="#ff5c8a" /></linearGradient></defs>
        </svg>
      );
    case "teams":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8">
          <circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="10" r="2.5" /><path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M14 18c.3-2 1.9-3.5 3.8-3.5S21.4 16 21.7 18" strokeLinecap="round" />
        </svg>
      );
    case "songs":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8">
          <path d="M9 18V5l11-2v13" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8">
          <path d="M21 11.5a8.5 8.5 0 1 1-4-7.2" strokeLinecap="round" /><path d="m8.5 11 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "insights":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );
    case "connect":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8">
          <circle cx="7" cy="8" r="3" /><circle cx="17" cy="16" r="3" />
          <path d="M9.5 9.8 14.5 14.2" strokeLinecap="round" />
          <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8b6cff" /><stop offset="1" stopColor="#ff5c8a" /></linearGradient></defs>
        </svg>
      );
    case "birthday":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M4 16c1.2 0 1.2 1 2.4 1s1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.4-1" />
          <path d="M12 8V5M12 5c.7 0 1.2-.5 1.2-1.2C13.2 3 12 1.8 12 1.8S10.8 3 10.8 3.8C10.8 4.5 11.3 5 12 5z" />
        </svg>
      );
    case "resources":
      return (
        <svg {...common} stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M13 3.5V8h4.5M9 13h6M9 17h4" />
        </svg>
      );
  }
}
