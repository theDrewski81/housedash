# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: customizable widgets for weather, schedule (calendar), dinners, groceries, and budget, with NextAuth (Google) and optional kiosk mode.

## Where to start when resuming

| Resource | Purpose |
|----------|--------|
| `README.md` | Setup, env, scripts, Docker, link to kiosk docs. |
| `.env.example` | Env vars: DB, NextAuth, Google OAuth/Calendar, OpenWeather, kiosk token. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only) setup: KIOSK_TOKEN, link user in DB, tablet vs phone. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + five widgets. |
| `prisma/schema.prisma` | Data model: User, sessions, Dinners, Groceries, BudgetIncome/BudgetExpense, UserPreferences. |
| `app/api/` | API routes for auth, health, SSE, user preferences, and each widget (CRUD where applicable). |
| `docker-compose.yml` | Run Postgres + app; see `.env` for `DATABASE_URL` and other vars. |

No `docs/` or PRD in the repo; infer scope from code and schema.

## Current state

- **Done:** Next.js 14 app with dashboard, five widgets (Weather, Schedule, Dinners, Groceries, Budget), NextAuth (Google), Prisma + PostgreSQL, user preferences (colors/background), kiosk auth, SSE endpoint, Docker Compose (Postgres + app), health API.
- **Last structure:** Full widget API surface (budget income/expenses, dinners, groceries, schedule, weather), drag-and-drop (dnd-kit), React Query, Tailwind UI.

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token for tablet mode |
| Data | PostgreSQL via Prisma |
| External | OpenWeatherMap, Google Calendar API |
| Run | Node; Docker Compose for local (postgres + app), `Dockerfile` for app image |

Deploy flow and hosting are not defined in the repo.

## Open / next

- Populate `README.md` with setup, env, and run instructions.
- Confirm next feature priorities (e.g. more widgets, notifications, multi-user/household).
- Any formal design/PRD or deployment docs to add under `docs/` (optional).

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB preferences, TS/React/Node/Python/SQL/Docker/etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, solution architect, etc.).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
