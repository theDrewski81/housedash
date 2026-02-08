# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: weather, schedule, dinners, groceries, and budget. Sign in with Google; optional kiosk mode for a tablet.

## Where to start when resuming

| Resource | Purpose |
|----------|--------|
| `README.md` | Setup, env, scripts, Docker, troubleshooting (login callback, missing tables, migrations). |
| `.env.example` | Env vars: DB, NextAuth, Google OAuth/Calendar, OpenWeather, kiosk token. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only): KIOSK_TOKEN, link user in DB, tablet vs phone. |
| `docs/CLOUDFLARE-TUNNEL.md` | Cloudflare Tunnel 502 fix: ingress, Host headers, health check. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + five widgets. |
| `prisma/schema.prisma` | Data model: User, sessions, Dinners, Groceries, BudgetIncome/BudgetExpense, UserPreferences. |
| `app/api/` | API routes for auth, health, SSE, user preferences, and each widget (CRUD where applicable). |
| `docker-compose.yml` | Run Postgres + app; migrate via `--profile tools`; set env in `.env`. |

## Current state

- **Done:** Next.js 14 app with dashboard, five widgets (Weather, Schedule, Dinners, Groceries, Budget), NextAuth (Google), Prisma + PostgreSQL, user preferences (colors/background), kiosk auth, SSE endpoint, Docker Compose (Postgres + app + migrate), health API. README has full setup and troubleshooting (login callback, missing tables, migration rollback). Initial DB migration (`20250207000000_init`) for user/session tables.
- **Recently changed (uncommitted or last commit):** `app/dashboard/layout.tsx`, `app/login/page.tsx`, `lib/auth.ts` — logging in dashboard layout and login page, auth redirect callback logging; `.gitignore` and migration setup noted in last commit.

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token for tablet mode |
| Data | PostgreSQL via Prisma |
| External | OpenWeatherMap, Google Calendar API |
| Run | Node; Docker Compose for local (postgres + app), `Dockerfile` for app; optional Cloudflare Tunnel |

Deploy flow and hosting are not defined in the repo (see `scripts/deploy-with-migrate.sh` for a deploy pattern).

## Open / next

- Confirm next feature priorities (e.g. more widgets, notifications, multi-user/household).
- Optional: formal design/PRD or deployment docs under `docs/`.
- Pick up from modified auth/dashboard/login files if continuing debug or cleanup.

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB preferences, TS/React/Node/Docker, etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, etc.).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
