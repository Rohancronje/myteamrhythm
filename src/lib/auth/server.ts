// Server-component auth helpers (import next/headers — must NOT be used in the
// proxy/edge context; that uses verifySession directly).
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type SessionUser } from "./session";

/** The current signed-in user, or null. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}
