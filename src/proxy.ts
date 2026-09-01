import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { canAccess, homePathFor } from "@/lib/auth/access";

// Route protection (Next 16 proxy, nodejs runtime). Everything requires a signed
// session except: the login page + auth API, and the volunteer pulse check-in
// (reached by a public link, no account needed). Role gating (member/leader can't
// reach team-wide pastoral surfaces) is enforced here too.
const PUBLIC = ["/login", "/reset", "/privacy", "/api/auth", "/pulse", "/api/pulse", "/api/webhooks", "/api/cron", "/api/ping", "/manifest.webmanifest", "/sw.js", "/offline.html", "/.well-known", "/icon.jpg", "/apple-icon.jpg", "/logo.jpg"];

// The one canonical address. Everything else (churchteamconnect.com, www, and the
// raw *.vercel.app deploy URLs) redirects here so there's a single URL and no
// per-domain session-cookie mismatch.
const CANONICAL_HOST = "myteamrhythm.online";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Force the canonical host — but NEVER for internal job routes (Vercel Cron / PCO
  // webhooks / ping invoke the deployment on its own host and must not be redirected),
  // and never in local dev.
  const host = request.headers.get("host") ?? "";
  const isJobRoute = pathname.startsWith("/api/cron") || pathname.startsWith("/api/webhooks") || pathname === "/api/ping";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (host && host !== CANONICAL_HOST && !isJobRoute && !isLocal) {
    const dest = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(dest, 308);
  }

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  const user = verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    // API calls must get JSON, never an HTML redirect — otherwise the browser's
    // res.json() throws "Unexpected token '<'" and the real "signed out" cause is hidden.
    if (isApi) {
      return NextResponse.json({ ok: false, error: "Your session has expired — reload the page and sign in again." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in — enforce role-based access. Send disallowed pages to the role's home
  // (coaches land on /connect, not / — which they can't see — avoiding a loop).
  if (!canAccess(user.role, pathname)) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: "You don't have access to this action." }, { status: 403 });
    }
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
