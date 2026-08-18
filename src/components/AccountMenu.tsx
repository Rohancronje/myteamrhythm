"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth/session";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", leader: "Worship leader", member: "Member" };

export function AccountMenu({ name, role, personId }: { name: string; role: Role; personId?: string }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const initials = name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  }

  async function signOut() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-solid py-1 pl-1 pr-2.5"
        aria-label="Account"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full grad-brand font-display text-xs font-bold text-white">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-medium leading-tight text-text">{name.split(" ")[0]}</span>
          <span className="block text-[10px] uppercase leading-tight tracking-wide text-faint">{ROLE_LABEL[role]}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-mute"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[90]" aria-hidden onClick={() => setOpen(false)} />
            <div className="fixed z-[100] w-52 overflow-hidden rounded-2xl border border-border bg-surface-solid shadow-2xl" style={{ top: pos.top, right: pos.right }}>
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text">{name}</p>
                <p className="text-xs text-mute">{ROLE_LABEL[role]}</p>
              </div>
              {personId ? (
                <Link href={`/journey/${personId}`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-text hover:bg-surface-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" /></svg>
                  View my journey
                </Link>
              ) : (
                <p className="px-4 py-3 text-xs text-faint">No linked profile</p>
              )}
              <button onClick={signOut} className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-left text-sm text-pink hover:bg-surface-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Sign out
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
