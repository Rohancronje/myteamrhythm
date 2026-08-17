"use client";

import { useRouter } from "next/navigation";
import type { Role } from "@/lib/auth/session";

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", leader: "Worship leader", member: "Member" };

export function AccountMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  const initials = name.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="text-right">
        <p className="text-xs font-medium text-text">{name.split(" ")[0]}</p>
        <p className="text-[10px] uppercase tracking-wide text-faint">{ROLE_LABEL[role]}</p>
      </div>
      <button
        onClick={signOut}
        title="Sign out"
        className="flex h-9 w-9 items-center justify-center rounded-full grad-brand font-display text-xs font-bold text-white"
      >
        {initials}
      </button>
    </div>
  );
}
