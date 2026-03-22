# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: weather, schedule, dinners, groceries, budget, and projects. Sign in with Google; optional kiosk mode for a tablet.

## Where to start when resuming

| Resource | Purpose |
|----------|---------|
| `README.md` | Setup, env, scripts, Docker (postgres → migrate → app), troubleshooting (login / `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, proxy headers, Google redirect URI, migrations). |
| `.env.example` | Env vars: DB, NextAuth (`NEXTAUTH_URL`, optional `AUTH_TRUST_HOST`, `NEXTAUTH_DEBUG`), Google OAuth/Calendar, OpenWeather, kiosk token. |
| `lib/auth.ts` | NextAuth options: Google + kiosk Credentials, JWT sessions, custom Prisma adapter hooks, OAuth cookie naming + explicit `useSecureCookies`. |
| `docs/DEBUG-SIGN-IN-FLOW.md` | Sign-in failure debug: auth flow, NextAuth `?error=` codes, logging steps. |
| `docs/CLOUDFLARE-TUNNEL.md` | Tunnel 502, ingress, `NEXTAUTH_URL`, optional `AUTH_TRUST_HOST=1`. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only): `KIOSK_TOKEN`, link user in DB, tablet vs phone. |
| `docs/PLAN-fix-location-save-and-apply.md` | Plan + checklist for weather location save UX when schema lags; related code in Admin Settings + `GET /api/admin/settings/schema-status`. |
| `scripts/deploy-with-migrate.sh` | Server-style flow: pull, rebuild migrate image, `prisma migrate deploy`, rebuild app, recreate app. |
| `docker-compose.yml` | Postgres + `migrate` (profile `tools`) + `app`; passes `AUTH_TRUST_HOST` through from `.env`. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + six widgets. |
| `components/DashboardWidgets.tsx` | Widget grid and expanded view; Prev/Next nav with inset content. |
| `components/widgets/ProjectsWidget.tsx` | Projects: kanban (Step 0–3), Add Todo, View Completions (list, pie, bar), drag-and-drop. |
| `components/widgets/DinnersWidget.tsx` | Dinners: weekly plan, rotation, Recent (past 7 days), Edit Dinner, Send to Groceries. |
| `components/widgets/GroceriesWidget.tsx` | Groceries: add, edit, delete, categories, deduplication. |
| `app/dashboard/admin/settings/page.tsx` | Admin Settings: weather location, calendars, Projects labels/colors; schema-status banner for weather columns. |
| `app/dashboard/admin/logs/page.tsx` | Admin Logs: audit log; optional debug log toggle. |
| `app/api/debug-log/route.ts` | Debug: POST client logs → `.cursor` log files (kiosk/sign-in instrumentation). |
| `prisma/schema.prisma` | Data model: User, Account, AppConfig, UserPreferences, ProjectTodo, Dinners, Groceries, Budget, etc. |

## Current state

- **Done:** Next.js 15 (App Router), dashboard with **six widgets** (Weather, Schedule, Dinners, Groceries, Budget, Projects), NextAuth 4 (Google OAuth + kiosk), Prisma + PostgreSQL, user preferences, SSE, Docker Compose, health API, admin user management.
- **Google sign-in (prod):** Working again after aligning NextAuth with reverse-proxy behavior: NextAuth v4 honors **`AUTH_TRUST_HOST`** for `X-Forwarded-*` origin (the old `trustHost` auth option was not valid in v4). **`useSecureCookies`** is set explicitly from `NEXTAUTH_URL` so PKCE/state/csrf and session cookies stay consistent on HTTPS. README, `.env.example`, `docker-compose.yml`, and `docs/CLOUDFLARE-TUNNEL.md` document this.
- **Projects widget:** Kanban, completions views, drag-and-drop; Step labels/colors in Admin → Settings → Projects.
- **Groceries / Dinners:** As in prior handoff (Send to Groceries, dedupe, Recent meals API, etc.).
- **Admin Settings / weather:** Plan in `docs/PLAN-fix-location-save-and-apply.md` implemented: friendly PATCH errors, `GET /api/admin/settings/schema-status`, migrations banner when weather columns missing.
- **Tests:** Vitest (`npm run test`), including `lib/grocery-refs.ts`.

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token + `/api/auth/kiosk-signin`; custom Prisma adapter (`getUserByEmail`, `createUser`) |
| Data | PostgreSQL via Prisma |
| External | OpenWeatherMap, Google Calendar API |
| Run | Node; Docker Compose (postgres + app); `migrate` service (`--profile tools`) |
| Tests | Vitest |

## Open / next

- Confirm next feature priorities (e.g. RBAC, more widgets, notifications).
- Optional: tests for `GET /api/widgets/dinners/recent` and Add Back / Add to Rotation flows.
- Groceries: more category keywords or reference entries based on usage.
- Optional: formal PRD or extra deployment runbooks under `docs/`.
- Ops: if login regressions appear, use `NEXTAUTH_DEBUG=1`, `[NextAuth]` in container logs, and README troubleshooting (verify live `NEXTAUTH_URL`, Google redirect URI, OAuth consent Testing vs Production).

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB, TS/React/Node/Docker, etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, solution architect, etc.).
- **`.cursor/commands/`** — Cursor commands (e.g. deploy, context-handoff, plan).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
