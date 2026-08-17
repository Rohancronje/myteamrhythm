# Deploying Rhythm

Recommended stack: **Vercel** (Next.js host + Cron) + **Supabase** (Postgres, Auth,
Realtime — needed for data persistence and, later, messaging).

## 1. Auth is live (self-contained)

Login works today with signed-cookie sessions + scrypt-hashed passwords — no
external service required. Roles: `admin` (all), `leader` (own + setlists),
`member` (own profile). The proxy (`src/proxy.ts`) gates every route except the
login page, the auth API, and the public `/pulse` check-in link.

**Add or change users** by editing `AUTH_USERS` (JSON). Hash a password:

```bash
node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log('scrypt:'+s+':'+c.scryptSync(process.argv[1],s,64).toString('hex'))" 'THEPASSWORD'
```

> Use `:` separators (not `$`) — `.env` expands `$`.
> Only an admin should edit this; that satisfies "only admins can make admins."

## 2. Environment variables (set these in Vercel → Project → Settings → Env)

| Var | Notes |
|---|---|
| `PCO_APP_ID`, `PCO_SECRET` | Planning Center PAT. **Rotate the leaked one.** |
| `PCO_SERVICE_TYPE_MAP` | `138758:sunday_am,148027:sunday_pm,139113:wednesday_night` |
| `PSEUDONYM_SALT` | long random string |
| `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AUTH_USERS` | JSON array of users (see above) |
| `DATABASE_URL` | Supabase Postgres (see step 4) |

Never commit these. `.env.local` is git-ignored.

## 3. Domain

Point `churchteamconnect.com` at Vercel (Vercel → Domains → add → follow the DNS
records). HTTPS is automatic.

## 4. Data persistence — the one real deploy task

Right now the app reads local `.data/*.json` snapshots written by the sync
scripts. **Vercel's runtime filesystem is ephemeral**, so those snapshots won't
work in production. Before/at deploy, move the data into Postgres:

1. Create a free Supabase project → copy the connection string into `DATABASE_URL`.
2. Generate + run the schema: `pnpm drizzle-kit generate && pnpm drizzle-kit migrate`
   (schema already defined in `src/db/schema.ts`).
3. Point the sync scripts at the DB (upsert people / serving_events / songs) and
   the data source at the DB instead of the JSON snapshot.
4. Schedule the sync with **Vercel Cron** (nightly) so the roster + setlists stay
   fresh.

This Postgres step is also the foundation for the planned user profiles and
messaging, so it is not throwaway work.

## 5. Deploy

```bash
# from the repo
vercel            # first run links the project
vercel --prod     # production deploy
```

(Run `vercel login` yourself — CLI auth is interactive.)

## Privacy reminder

The pastoral view shows real names and, later, stored messages. Decide retention +
confidentiality policy before messaging ships, and keep the role gate (proxy +
Supabase RLS) as the enforcement layer.
