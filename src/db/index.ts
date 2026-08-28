// Lazy Postgres client. We don't connect at import time so the app can render the
// seeded pilot data with no database configured; the connection is only created
// when a route actually needs persistence.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Serverless pool against Supabase's transaction pooler (no prepared statements).
  // Vercel runs multiple requests concurrently per instance, and each page render
  // fans out several queries + prefetches sibling routes — so max:3 starved and
  // requests hung waiting for a free connection. The transaction pooler multiplexes
  // many client connections onto few server ones, so a larger client pool is safe.
  const client = postgres(url, { prepare: false, max: 20, idle_timeout: 20, connect_timeout: 10 });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
