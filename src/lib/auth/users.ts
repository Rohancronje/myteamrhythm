// User store. Reads from Postgres when DATABASE_URL is set, otherwise from the
// AUTH_USERS env var (so no database is needed to start). Passwords are
// scrypt-hashed — plaintext never touches disk or the repo.
//
// AUTH_USERS format (one line of JSON):
//   [{"email":"a@b.com","name":"Rohan","role":"admin","personId":"123","hash":"scrypt:salt:hex"}]

import { scryptSync, timingSafeEqual } from "node:crypto";
import type { Role, SessionUser } from "./session";

interface StoredUser {
  email: string;
  name: string;
  role: Role;
  personId?: string | null;
  teams?: string[] | null;
  hash: string; // scrypt:<saltHex>:<hashHex>  (":" not "$" — .env expands $)
}

function loadEnvUsers(): StoredUser[] {
  const raw = process.env.AUTH_USERS;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as StoredUser[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function findUser(email: string): Promise<StoredUser | null> {
  const target = email.trim().toLowerCase();
  if (process.env.DATABASE_URL) {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select().from(users).where(eq(users.email, target));
    const u = rows[0];
    if (!u) return null;
    return { email: u.email, name: u.name, role: u.role as Role, personId: u.personId, teams: u.teams, hash: u.passwordHash };
  }
  return loadEnvUsers().find((u) => u.email.trim().toLowerCase() === target) ?? null;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, saltHex, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The team ids a coach is assigned to (fresh from the DB, so changes take effect
 *  without re-login). Source of truth is the team_coaches join. Empty if none. */
export async function getUserTeams(email: string): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { getDb } = await import("@/db");
    const { teamCoaches } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await getDb().select({ teamId: teamCoaches.teamId }).from(teamCoaches).where(eq(teamCoaches.coachEmail, email.trim().toLowerCase()));
    return rows.map((r) => r.teamId);
  } catch {
    return [];
  }
}

/** Returns the user on a correct email+password match, else null. */
export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await findUser(email);
  if (!user) return null;
  if (!verifyPassword(password, user.hash)) return null;
  return { email: user.email, name: user.name, role: user.role, personId: user.personId ?? undefined, teams: user.teams ?? undefined };
}
