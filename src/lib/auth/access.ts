// Central access rules by role (handover section 3):
//  - admin   → everything
//  - leader  → own profile + Song Intelligence (setlists)
//  - member  → own profile only
// Section-level gating is enforced in the proxy; per-record ownership (you may
// only open YOUR OWN profile) is enforced in the /journey page.

import type { Role } from "./session";

/** Whether `role` may access the given top-level path. */
export function canAccess(role: Role, pathname: string): boolean {
  if (role === "admin") return true;

  // Admin-only surfaces (team-wide pastoral data).
  if (pathname === "/teams" || pathname.startsWith("/teams/")) return false;
  if (pathname === "/insights") return false;
  if (pathname.startsWith("/api/sync")) return false;

  // Setlists: leaders too, but not members.
  if (pathname === "/songs" || pathname.startsWith("/songs/")) return role === "leader";

  // Home, own profile, pulse — allowed for everyone signed in.
  return true;
}

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "teams" | "songs" | "check" | "insights" | "me" | "next";
}

/** The bottom-nav items appropriate for a role (and their own profile link). */
export function navFor(role: Role, personId?: string): NavItem[] {
  const me = personId ? `/journey/${personId}` : "/next";
  if (role === "admin") {
    return [
      { href: "/", label: "Home", icon: "home" },
      { href: "/next", label: "Next up", icon: "next" },
      { href: "/teams", label: "Teams", icon: "teams" },
      { href: "/songs", label: "Songs", icon: "songs" },
      { href: "/insights", label: "Insights", icon: "insights" },
    ];
  }
  if (role === "leader") {
    return [
      { href: "/next", label: "Next up", icon: "next" },
      { href: me, label: "Me", icon: "me" },
      { href: "/songs", label: "Songs", icon: "songs" },
      { href: "/pulse", label: "Check-in", icon: "check" },
    ];
  }
  return [
    { href: "/next", label: "Next up", icon: "next" },
    { href: me, label: "Me", icon: "me" },
    { href: "/pulse", label: "Check-in", icon: "check" },
  ];
}
