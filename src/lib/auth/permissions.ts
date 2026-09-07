// Per-account posting permissions. Admins and the platform owner can always post;
// other accounts (e.g. coaches, leaders) are granted individually on the Accounts page.

import { isOwner } from "./owner";
import type { Role } from "./session";

export interface UserPerms {
  canPostEvents: boolean;
  canPostResources: boolean;
}

export async function getPerms(email: string, role: Role): Promise<UserPerms> {
  if (role === "admin" || isOwner(email)) return { canPostEvents: true, canPostResources: true };
  if (!process.env.DATABASE_URL) return { canPostEvents: false, canPostResources: false };
  try {
    const { getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [u] = await getDb().select({ e: users.canPostEvents, r: users.canPostResources }).from(users).where(eq(users.email, email.toLowerCase()));
    return { canPostEvents: !!u?.e, canPostResources: !!u?.r };
  } catch {
    return { canPostEvents: false, canPostResources: false };
  }
}
