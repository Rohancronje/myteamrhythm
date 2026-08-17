# Rhythm

A stats and insight platform for worship and volunteer teams. It tracks serving
**load**, predicts burnout before it happens, and measures team emotional /
spiritual **health** — not just attendance.

**Pilot:** City Impact Church, North Shore — NS Family Services (Sunday AM / PM,
Wednesday Night).

## The idea

Borrow the **Acute:Chronic Workload Ratio (ACWR)** from sports science — the model
athletic teams use to predict injury risk by comparing recent training load to a
rolling baseline — and apply it to serving load. A ratio sustained above ~1.3–1.5
flags a spike *before* it becomes a resignation conversation.

Cross-reference that objective load signal with a subjective **pulse check-in**
(two questions after a service). Load alone gives false positives; feeling alone
gives no early warning. Together they're a real leading indicator.

## Architecture

```
Planning Center API ──(sync)──▶ Postgres ──▶ ACWR + wellbeing engine ──▶ dashboards
Pulse check-in (web link) ──────▶ (pseudonymous)
```

- `src/lib/rhythm/acwr.ts` — the load engine (weekly-cadence adapted ACWR, EWMA).
- `src/lib/rhythm/wellbeing.ts` — load × feeling cross-reference + the **privacy gate**.
- `src/lib/pco/` — Planning Center Services API client + pseudonymiser.
- `src/db/schema.ts` — Postgres schema (Drizzle), privacy-enforceable by design.
- `src/lib/data/seed.ts` — deterministic pilot data so the UI runs before PCO is wired.

## Privacy (non-negotiable)

- Pulse data is **pseudonymous by default**; team dashboards are aggregated and anonymised.
- Only **pastoral-care leads** can unlock individual detail, and only once a risk threshold is crossed (`canUnlockIndividual`).
- Output is a **prompt for a human conversation** — never a public flag, score, or leaderboard.
- Everyone gets their own private **serving journey** view.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in PCO + DB creds (NEVER commit .env.local)
pnpm dev                     # http://localhost:3000
pnpm tsx scripts/verify-engine.ts   # sanity-check the ACWR engine
```

### Connecting Planning Center (Phase 0 probe)

1. Create a Personal Access Token at
   <https://api.planningcenteronline.com/oauth/applications>.
2. Put the app id / secret in `.env.local` as `PCO_APP_ID` / `PCO_SECRET`.
3. `GET /api/sync` to verify the token and list your `service_types`.
4. Fill `PCO_SERVICE_TYPE_MAP` (e.g. `123:sunday_am,124:sunday_pm,125:wednesday_night`).
5. `POST /api/sync` to pull scheduled assignments.

> **Security:** if a token ever leaks (chat, screenshot, commit), rotate it
> immediately. The whole trust model depends on it.

## Routes

| Route | What |
| --- | --- |
| `/` | Aggregated team dashboard (pastoral leads) |
| `/pulse` | Post-service pulse check-in (the web link) |
| `/journey/[id]` | A person's private serving journey |
| `/api/sync` | Planning Center verify + sync |
| `/api/pulse` | Pulse submission |
