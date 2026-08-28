// Contact details + birthday per person, keyed by PCO id. Survives roster syncs
// (kept in its own table). Sourced from manual entry / import / PCO when available.

export interface Contact {
  email: string | null;
  phone: string | null;
  birthday: string | null; // YYYY-MM-DD (year may be a placeholder)
  source: string;
}

import { unstable_cache } from "next/cache";

// Contacts change only when someone edits them (revalidated via tag "contacts"),
// so cache the entries and rebuild the Map per request (unstable_cache can't hold a Map).
const loadContactEntries = unstable_cache(
  async (): Promise<[string, Contact][]> => {
    if (!process.env.DATABASE_URL) return [];
    try {
      const { getDb } = await import("@/db");
      const { personContacts } = await import("@/db/schema");
      const rows = await getDb().select().from(personContacts);
      return rows.map((r): [string, Contact] => [
        r.pcoId,
        { email: r.email ?? null, phone: r.phone ?? null, birthday: r.birthday ?? null, source: r.source },
      ]);
    } catch {
      return [];
    }
  },
  ["rhythm:contacts"],
  { revalidate: 300, tags: ["contacts"] },
);

export async function getContactsMap(): Promise<Map<string, Contact>> {
  return new Map(await loadContactEntries());
}

/** Days until the next occurrence of a birthday (month/day), or null. */
export function daysUntilBirthday(birthday: string | null, now: Date): number | null {
  if (!birthday) return null;
  const m = birthday.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let next = new Date(Date.UTC(now.getUTCFullYear(), month, day));
  if (next < today) next = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day));
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}
