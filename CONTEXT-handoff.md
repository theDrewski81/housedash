# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: weather, schedule, dinners, groceries, and budget. Sign in with Google; optional kiosk mode for a tablet. Admin user management (first-sign-in admin, approval queue, roles, audit log, Add New User) is implemented.

## Where to start when resuming

| Resource | Purpose |
|----------|--------|
| `README.md` | Setup, env, scripts, Docker, troubleshooting (login callback, missing tables, migrations). |
| `.env.example` | Env vars: DB, NextAuth, Google OAuth/Calendar, OpenWeather, kiosk token. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only): KIOSK_TOKEN, link user in DB, tablet vs phone. |
| `docs/CLOUDFLARE-TUNNEL.md` | Cloudflare Tunnel 502 fix: ingress, Host headers, health check. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + five widgets. |
| `components/DashboardWidgets.tsx` | Widget grid and expanded view; Prev/Next nav with inset content. |
| `app/dashboard/admin/users/page.tsx` | User management: settings, Add New User, user list, approval queue. |
| `app/dashboard/admin/logs/page.tsx` | Admin audit log; top "Log settings" box with "Log user management actions" toggle. |
| `prisma/schema.prisma` | Data model: User (role, status), AppConfig, AdminAuditLog, sessions, Dinners, Groceries, Budget, UserPreferences. |
| `lib/auth.ts` | NextAuth + custom adapter (first user = admin, allowAccountCreation, pending_approval, getUserByEmail case-insensitive, createUser one-per-email). |
| `app/api/admin/` | Admin APIs: settings, users (GET/POST/PATCH, delete by id), logs, me (isAdmin). |
| `docker-compose.yml` | Run Postgres + app; migrate via `--profile tools`; set env in `.env`. |

## Current state

- **Done:** Next.js 15 app with dashboard, five widgets (Weather, Schedule, Dinners, Groceries, Budget), NextAuth (Google + kiosk), Prisma + PostgreSQL, user preferences, kiosk auth, SSE, Docker Compose, health API. Widget expansion and Prev/Next navigation with content inset (`md:px-14`) so buttons do not overlap widget content.
- **User management:** First Google sign-in becomes admin; toggle to allow new sign-ups (new users go to approval queue, one per email). Add New User dialog (email, first/last name, role, status) creates user in DB; they can sign in with Google (case-insensitive email). User list: edit name/status/role, full delete, sign out. Approval queue: approve (→ active, in list) or reject (user deleted). "Log user management actions" lives on Logs page (top Log settings box). Admin nav gated by `session.user.role === "admin"` in DashboardLayout; admin routes use `requireAdmin()`. Success messages: "User x has been added.", "User x has been deleted.", "User x role has changed to … This change will be visible on their next login." (from PATCH results and DELETE/POST responses).
- **Auth adapter:** `getUserByEmail` case-insensitive; `createUser` when allowAccountCreation is true checks for existing user by email (case-insensitive) and returns them (no duplicate queue entries), else creates with `pending_approval`. Migrations: `20250207000000_init`, `20250208000000_add_user_management_and_admin`.

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token; custom adapter for first-admin and approval flow |
| Data | PostgreSQL via Prisma (User roles/status, AppConfig, AdminAuditLog) |
| External | OpenWeatherMap, Google Calendar API |
| Run | Node; Docker Compose (postgres + app), `Dockerfile`; optional Cloudflare Tunnel |

Deploy: run migrations (e.g. `npm run db:migrate:deploy` with project Prisma); rebuild app with `--no-cache` if UI changes don’t show.

## Open / next

- Confirm next feature priorities (e.g. RBAC, more widgets, notifications).
- Optional: formal design/PRD or deployment docs under `docs/`.

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB preferences, TS/React/Node/Docker, etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, etc.).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
