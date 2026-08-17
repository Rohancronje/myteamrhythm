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

## 4. Data persistence — DONE (Supabase Postgres)

The data layer is wired to Postgres:
- Schema in `src/db/schema.ts`; migration applied (`drizzle/0000_*.sql`).
- Sync scripts (`pco-sync`, `pco-songs-sync`) upsert into Postgres when
  `DATABASE_URL` is set; `db-seed.ts` backfills from a snapshot without a
  Planning Center round-trip.
- The data source (`src/lib/data/team.ts`, `songs.ts`) and auth
  (`src/lib/auth/users.ts`) read from Postgres when `DATABASE_URL` is set, and
  fall back to the local snapshot / `AUTH_USERS` env when it isn't.

Set on Vercel:
- `DATABASE_URL` → Supabase **transaction pooler** (`:6543`) for the app runtime.
- `DATABASE_URL_SESSION` → Supabase **session pooler** (`:5432`) for migrations.

Keep data fresh with **Vercel Cron** (nightly) hitting a sync route, or run the
sync scripts on a schedule.

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
