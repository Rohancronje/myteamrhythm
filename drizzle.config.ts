import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't auto-load .env.local — load it here. Migrations use the
// session pooler (5432); the app runtime uses the transaction pooler (6543).
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
  }
} catch {
  /* no .env.local — rely on process env */
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL ?? "postgres://localhost:5432/rhythm",
  },
  verbose: true,
  strict: true,
});
