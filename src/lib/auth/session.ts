// Self-contained sessions: an HMAC-signed token in an httpOnly cookie. No external
// auth service required, so it runs locally and on Vercel unchanged. Swaps to
// Supabase Auth later without touching callers. Roles: admin (all), leader (own +
// setlists), member (own profile).

import { createHmac, timingSafeEqual } from "node:crypto";

export type Role = "admin" | "coach" | "leader" | "member";

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
  /** The person's Planning Center id — links a login to their own profile. */
  personId?: string;
  /** For coaches: the Planning Center teams they connect with. */
  teams?: string[];
}

export const SESSION_COOKIE = "rhythm_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}
function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}
function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Signs a session token valid for MAX_AGE_SECONDS. */
export function signSession(user: SessionUser): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = b64url(JSON.stringify({ ...user, exp }));
  return `${payload}.${sign(payload)}`;
}

/** Verifies signature + expiry; returns the user or null. */
export function verifySession(token: string | undefined): SessionUser | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(payload)) as SessionUser & { exp: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: data.email, name: data.name, role: data.role, personId: data.personId, teams: data.teams };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
