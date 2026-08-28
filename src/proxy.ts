import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { canAccess, homePathFor } from "@/lib/auth/access";

// Route protection (Next 16 proxy, nodejs runtime). Everything requires a signed
// session except: the login page + auth API, and the volunteer pulse check-in
// (reached by a public link, no account needed). Role gating (member/leader can't
// reach team-wide pastoral surfaces) is enforced here too.
const PUBLIC = ["/login", "/privacy", "/api/auth", "/pulse", "/api/pulse", "/api/webhooks", "/api/cron", "/api/ping", "/manifest.webmanifest", "/sw.js", "/offline.html", "/.well-known", "/icon.jpg", "/apple-icon.jpg", "/logo.jpg"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const user = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in — enforce role-based access. Send disallowed pages to the role's home
  // (coaches land on /connect, not / — which they can't see — avoiding a loop).
  if (!canAccess(user.role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = homePathFor(user.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
