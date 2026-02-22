# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: weather, schedule, dinners, groceries, and budget. Sign in with Google; optional kiosk mode for a tablet. Admin user management (first-sign-in admin, approval queue, roles, audit log, Add New User) is implemented. Weather location is configurable via Admin → Settings (city, state or zip).

## Where to start when resuming

| Resource | Purpose |
|----------|--------|
| `README.md` | Setup, env, scripts, Docker (postgres → migrate → app), troubleshooting (login callback, missing tables, migrations). |
| `.env.example` | Env vars: DB, NextAuth, Google OAuth/Calendar, OpenWeather, kiosk token. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only): KIOSK_TOKEN, link user in DB, tablet vs phone. |
| `docs/CLOUDFLARE-TUNNEL.md` | Cloudflare Tunnel 502 fix: ingress, Host headers, health check. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + five widgets. |
| `components/DashboardWidgets.tsx` | Widget grid and expanded view; Prev/Next nav with inset content. |
| `app/dashboard/admin/settings/page.tsx` | Admin Settings: Weather location (city, state or zip), schema-status banner when migrations not run. |
| `app/dashboard/admin/users/page.tsx` | User management: settings, Add New User, user list, approval queue. |
| `app/dashboard/admin/logs/page.tsx` | Admin audit log; top "Log settings" box with "Log user management actions" toggle. |
| `prisma/schema.prisma` | Data model: User (role, status), AppConfig (incl. weatherLat, weatherLon, weatherLocationName), AdminAuditLog, sessions, Dinners, Groceries, Budget, UserPreferences. |
| `lib/auth.ts` | NextAuth + custom adapter (first user = admin, allowAccountCreation, pending_approval, getUserByEmail case-insensitive, createUser one-per-email). |
| `lib/api/geocode.ts` | OpenWeather Geocoding: city/state or zip → lat/lon/name; appends ",US" when 0–1 comma. |
| `app/api/admin/` | Admin APIs: settings (GET/PATCH), settings/schema-status (GET, weatherLocationSupported), users, logs, me (isAdmin). |
| `app/api/widgets/weather/route.ts` | Weather API: uses getAppConfig() for lat/lon when no query params; widget uses this. |
| `docker-compose.yml` | Postgres + app; migrate via `--profile tools run --rm migrate` (run after postgres, before app). |

## Current state

- **Done:** Next.js 15 app with dashboard, five widgets (Weather, Schedule, Dinners, Groceries, Budget), NextAuth (Google + kiosk), Prisma + PostgreSQL, user preferences, kiosk auth, SSE, Docker Compose, health API. Widget expansion and Prev/Next navigation with content inset.
- **User management:** First Google sign-in becomes admin; toggle to allow new sign-ups (approval queue, one per email). Add New User, user list (edit/delete/sign out), approval queue. "Log user management actions" on Logs page. Admin nav and routes gated by `requireAdmin()`.
- **Weather location:** Admin → Settings has a single "Location" input (city, state or zip). On save, geocode (OpenWeather Geocoding API) runs; result is stored in AppConfig (weatherLat, weatherLon, weatherLocationName). Weather widget uses that location via GET /api/widgets/weather. If migrations adding weather columns have not been run: Settings page shows banner "Migrations required to save weather location…"; GET settings still loads (getAppConfig returns defaults on schema error); PATCH returns 503 with friendly message. Schema-status endpoint GET /api/admin/settings/schema-status returns weatherLocationSupported so the banner can show. Migrations: `20250215000000_add_weather_location_to_app_config` (weather_lat, weather_lon), `20250216000000_add_weather_location_name_to_app_config`.
- **Collapsed weather widget:** Current temp + conditions on left; today’s high/low on right; next sunrise/sunset instead of pressure (data from OpenWeather current weather).

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token; custom adapter for first-admin and approval flow |
| Data | PostgreSQL via Prisma (User, AppConfig with weather fields, AdminAuditLog, etc.) |
| External | OpenWeatherMap (weather + geocoding), Google Calendar API |
| Run | Node; Docker Compose (postgres + app); migrate service (profile tools, Debian); optional Cloudflare Tunnel |

Deploy: `git pull` → `docker compose build --no-cache` (and `docker compose build --no-cache migrate` when new migrations exist) → `docker compose up -d postgres` → `docker compose --profile tools run --rm migrate` → `docker compose up -d`. Migrations must run before the app; rebuild the migrate image so it includes the latest migration files.

## Open / next

- Confirm next feature priorities (e.g. RBAC, more widgets, notifications).
- Optional: formal design/PRD or deployment docs under `docs/`.
- Plan docs in `docs/` (PLAN-*.md) are reference only; implementation is done.

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB preferences, TS/React/Node/Docker, etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, etc.).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
