# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: weather, schedule, dinners, groceries, and budget. Sign in with Google; optional kiosk mode for a tablet. Admin user management (first-sign-in admin, approval queue, roles, audit log) is implemented.

## Where to start when resuming

| Resource | Purpose |
|----------|--------|
| `README.md` | Setup, env, scripts, Docker, troubleshooting (login callback, missing tables, migrations). |
| `.env.example` | Env vars: DB, NextAuth, Google OAuth/Calendar, OpenWeather, kiosk token. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only): KIOSK_TOKEN, link user in DB, tablet vs phone. |
| `docs/CLOUDFLARE-TUNNEL.md` | Cloudflare Tunnel 502 fix: ingress, Host headers, health check. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + five widgets. |
| `app/dashboard/admin/users/page.tsx` | User management UI: account-creation toggle, user list, approval queue, audit toggle. |
| `app/dashboard/admin/logs/page.tsx` | Admin audit log (read-only). |
| `prisma/schema.prisma` | Data model: User (role, status, firstName, lastName), AppConfig, AdminAuditLog, sessions, Dinners, Groceries, Budget, UserPreferences. |
| `lib/auth.ts` | NextAuth + custom adapter (first user = admin, allowAccountCreation, pending_approval). |
| `app/api/admin/` | Admin APIs: settings, users (list/bulk/delete/sign-out), logs, me (isAdmin). |
| `docker-compose.yml` | Run Postgres + app; migrate via `--profile tools`; set env in `.env`. |

## Current state

- **Done:** Next.js 15 app with dashboard, five widgets (Weather, Schedule, Dinners, Groceries, Budget), NextAuth (Google + kiosk), Prisma + PostgreSQL, user preferences, kiosk auth, SSE, Docker Compose, health API. **User management:** first Google sign-in becomes admin and locks account creation; toggle to allow new sign-ups (→ approval queue); user list (edit name/status/role, delete, sign out); approval queue (approve/reject + role); audit log (Logs view) with “Log user management actions” toggle (default off). Migrations: `20250207000000_init`, `20250208000000_add_user_management_and_admin`. Next 15 async `params` used in all dynamic API routes. Security: npm audit 0 vulnerabilities (Next 15, glob override).
- **Recently:** Admin nav (“User management”, “Logs”) gated by `session.user.role === "admin"` in DashboardLayout so only admins see those links; admin routes protected by `requireAdmin()`. After deploy, use `docker compose build --no-cache app` if admin links don’t appear.

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token; custom adapter for first-admin and approval flow |
| Data | PostgreSQL via Prisma (User roles/status, AppConfig, AdminAuditLog) |
| External | OpenWeatherMap, Google Calendar API |
| Run | Node; Docker Compose (postgres + app), `Dockerfile`; optional Cloudflare Tunnel |

Deploy: run migrations (e.g. `npm run db:migrate:deploy` with project Prisma, not global Prisma 7); rebuild app with `--no-cache` if UI changes don’t show.

## Open / next

- **Done:** Admin nav gated by role in DashboardLayout (only admins see “User management” / Logs).
- Confirm next feature priorities (e.g. RBAC, more widgets, notifications).
- Optional: formal design/PRD or deployment docs under `docs/`.

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB preferences, TS/React/Node/Docker, etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, etc.).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
