// User store. Seeded from the AUTH_USERS env var (JSON) so no database is needed
// to start; moves to Supabase/Postgres when messaging arrives. Passwords are
// scrypt-hashed — plaintext never touches disk or the repo.
//
// AUTH_USERS format (one line of JSON):
//   [{"email":"a@b.com","name":"Rohan","role":"admin","hash":"scrypt$salt$hex"}]

import { scryptSync, timingSafeEqual } from "node:crypto";
import type { Role, SessionUser } from "./session";

interface StoredUser {
  email: string;
  name: string;
  role: Role;
  hash: string; // scrypt:<saltHex>:<hashHex>  (":" not "$" — .env expands $)
}

function loadUsers(): StoredUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as StoredUser[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, saltHex, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Returns the user on a correct email+password match, else null. */
export function verifyCredentials(email: string, password: string): SessionUser | null {
  const target = email.trim().toLowerCase();
  const user = loadUsers().find((u) => u.email.trim().toLowerCase() === target);
  if (!user) return null;
  if (!verifyPassword(password, user.hash)) return null;
  return { email: user.email, name: user.name, role: user.role };
}

export function hasAnyUsers(): boolean {
  return loadUsers().length > 0;
}
