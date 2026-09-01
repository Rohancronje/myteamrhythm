// Central access rules by role. The app is now a volunteer connection platform:
//  - admin → everything (manage teams, members, coaches; connect; accounts)
//  - coach → their Connect workspace only
//  - leader / member → no app access (volunteers are records, not logins)
// Section-level gating is enforced in the proxy.

import type { Role } from "./session";

/** Whether `role` may access the given top-level path. */
export function canAccess(role: Role, pathname: string): boolean {
  if (role === "admin") return true;

  // Coaches: the connect tool (their own teams) + birthdays + logging contacts.
  if (role === "coach") {
    if (pathname === "/connect" || pathname.startsWith("/connect/")) return true;
    if (pathname === "/birthdays") return true;
    // Songs Insights is allowed at the proxy for any coach; the page itself further
    // restricts it to coaches on a worship team.
    if (pathname === "/songs-insights") return true;
    if (pathname.startsWith("/api/connect") || pathname.startsWith("/api/contacts")) return true;
    return false;
  }

  // leader / member have no surfaces in the connection platform.
  return false;
}

/** The landing page a role can actually access (avoids redirect loops). */
export function homePathFor(role: Role): string {
  if (role === "admin") return "/teams";
  if (role === "coach") return "/connect";
  return "/login";
}

export interface NavItem {
  href: string;
  label: string;
  icon: "home" | "teams" | "songs" | "check" | "insights" | "me" | "next" | "today" | "connect" | "birthday";
}

/** The nav items appropriate for a role. `worshipCoach` adds the Songs tab for a
 *  coach who's on a worship team (admins always get it). */
export function navFor(role: Role, opts?: { worshipCoach?: boolean }): NavItem[] {
  if (role === "admin") {
    return [
      { href: "/teams", label: "Teams", icon: "teams" },
      { href: "/connect", label: "Connect", icon: "connect" },
      { href: "/songs-insights", label: "Songs", icon: "songs" },
      { href: "/birthdays", label: "Birthdays", icon: "birthday" },
    ];
  }
  if (role === "coach") {
    const items: NavItem[] = [{ href: "/connect", label: "Connect", icon: "connect" }];
    if (opts?.worshipCoach) items.push({ href: "/songs-insights", label: "Songs", icon: "songs" });
    items.push({ href: "/birthdays", label: "Birthdays", icon: "birthday" });
    return items;
  }
  return [];
}
