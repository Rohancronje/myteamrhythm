// Self-service password reset tokens. A signed, expiring token (HMAC over AUTH_SECRET)
// — no DB row needed. Namespaced with a "pwreset:" prefix so a session token can never
// be replayed as a reset token (and vice-versa).

import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 60 * 60; // links are valid for 1 hour

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}
function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}
function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}
function sign(payload: string): string {
  return createHmac("sha256", secret()).update("pwreset:" + payload).digest("base64url");
}

/** A token that authorises resetting `email`'s password, valid for TTL_SECONDS. */
export function signResetToken(email: string): string {
  const payload = b64url(JSON.stringify({ email: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

/** The email a valid, unexpired token authorises, or null. */
export function verifyResetToken(token: string | undefined): string | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(payload)) as { email: string; exp: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.email;
  } catch {
    return null;
  }
}
