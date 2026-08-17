"use client";

// Fixed bottom nav (handover section 2) — native-app convention.
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/teams", label: "Teams", icon: TeamsIcon },
  { href: "/songs", label: "Songs", icon: SongsIcon },
  { href: "/pulse", label: "Check-in", icon: CheckIcon },
  { href: "/insights", label: "Insights", icon: InsightsIcon },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-[#0c0b16]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 py-2">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] transition-colors"
              style={{ color: active ? "var(--color-text)" : "var(--color-faint)" }}
            >
              <it.icon active={active} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" stroke={active ? "url(#g1)" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round" />
      <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8b6cff" /><stop offset="1" stopColor="#ff5c8a" /></linearGradient></defs>
    </svg>
  );
}
function TeamsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#ff5c8a" : "currentColor"} strokeWidth="1.8">
      <circle cx="8" cy="9" r="3" /><circle cx="16.5" cy="10" r="2.5" /><path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M14 18c.3-2 1.9-3.5 3.8-3.5S21.4 16 21.7 18" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#38dd9b" : "currentColor"} strokeWidth="1.8">
      <path d="M21 11.5a8.5 8.5 0 1 1-4-7.2" strokeLinecap="round" /><path d="m8.5 11 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SongsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#8b6cff" : "currentColor"} strokeWidth="1.8">
      <path d="M9 18V5l11-2v13" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" />
    </svg>
  );
}
function InsightsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#5cc2ff" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}
