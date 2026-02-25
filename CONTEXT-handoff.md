# Context handoff

This doc helps bring Cursor AI (or a human) up to speed when switching machines or resuming work.

## Project in one sentence

**housedash** is a household dashboard web app: weather, schedule, dinners, groceries, budget, and projects. Sign in with Google; optional kiosk mode for a tablet.

## Where to start when resuming

| Resource | Purpose |
|----------|---------|
| `README.md` | Setup, env, scripts, Docker (postgres → migrate → app), troubleshooting (login callback, missing tables, migrations). |
| `.env.example` | Env vars: DB, NextAuth, Google OAuth/Calendar, OpenWeather, kiosk token. |
| `docs/KIOSK-SETUP.md` | Kiosk (tablet-only): KIOSK_TOKEN, link user in DB, tablet vs phone. |
| `docs/CLOUDFLARE-TUNNEL.md` | Cloudflare Tunnel 502 fix: ingress, Host headers, health check. |
| `app/dashboard/page.tsx` | Dashboard entry: layout + six widgets. |
| `components/DashboardWidgets.tsx` | Widget grid and expanded view; Prev/Next nav with inset content. |
| `components/widgets/ProjectsWidget.tsx` | Projects: kanban board (Step 0–3), Add Todo, View Completions (list, By Priority pie, By Time bar charts), drag-and-drop. |
| `components/widgets/DinnersWidget.tsx` | Dinners: weekly plan, rotation, Recent (past 7 days), Edit Dinner (with prev/next), Send to Groceries. |
| `components/widgets/GroceriesWidget.tsx` | Groceries: add, edit (click item), delete, categories, deduplication. |
| `app/dashboard/admin/settings/page.tsx` | Admin Settings: Weather location, Calendars, **Projects** (Step 0–3 labels, colors for Step 1–3). |
| `app/api/widgets/dinners/recent/route.ts` | Dinners Recent API: past 7 days of meals (date &lt; today, date ≥ today − 7). |
| `lib/parse-ingredient.ts` | Parse ingredient lines → item + quantity; strips bullets, modifiers, handles ranges. |
| `lib/grocery-dedupe.ts` | Item matching, quantity merging, range support. |
| `lib/grocery-refs.ts` | Reference tables, units, modifiers, `inferCategory()`, `stripItemModifiers()`. |
| `prisma/schema.prisma` | Data model: User, AppConfig, UserPreferences (projectsConfig), ProjectTodo, Dinners, Groceries, Budget, etc. |
| `docker-compose.yml` | Postgres + migrate (profile tools) + app; migrate runs after postgres, before app. |

## Current state

- **Done:** Next.js 15 app with dashboard, **six widgets** (Weather, Schedule, Dinners, Groceries, Budget, **Projects**), NextAuth (Google + kiosk), Prisma + PostgreSQL, user preferences, kiosk auth, SSE, Docker Compose, health API. Admin user management, weather location via Admin Settings.
- **Projects widget (recent):**
  - Kanban board with 4 columns (Step 0–3: Not Ready, Starting, In Progress, Complete). Labels and colors configurable in Admin → Settings → Projects.
  - Collapsed view: three numbers (counts for Step 0–2 only) over semi-transparent colored boxes.
  - Add Todo: Project title, Priority (1–3), Status. Drag-and-drop between columns. Cards sorted by priority ASC, createdAt ASC.
  - Complete column: 5s delay, then card collapses; list rises.
  - View Completions: list (with priority change indicator 3↑1), By Priority pie chart, By Time bar charts per ending priority. Delete button per item.
- **Groceries widget:** Send to Groceries from Edit Dinner, deduplication, auto-categorization, edit mode.
- **Dinners widget:** Weekly plan, rotation, Edit Dinner with prev/next, Add to Rotation, Send to Groceries. **Recent** link (opposite View Rotation): meals from past 7 days; double-click opens popup with [Add Back] (moves to first free slot) or [Add to Rotation]. API: `GET /api/widgets/dinners/recent?asOf=yyyy-MM-dd`.
- **Tests:** Vitest (`npm run test`) for `lib/grocery-refs.ts`.

## Architecture / stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), React 18, Tailwind, Recharts, @dnd-kit, TanStack Query |
| Auth | NextAuth 4 (Google OAuth); kiosk token; custom adapter |
| Data | PostgreSQL via Prisma |
| External | OpenWeatherMap, Google Calendar API |
| Run | Node; Docker Compose (postgres + app); migrate service (profile tools) |
| Tests | Vitest |

## Open / next

- Confirm next feature priorities (e.g. RBAC, more widgets, notifications).
- Dinners Recent: optional tests for `GET /api/widgets/dinners/recent` and Add Back / Add to Rotation flows.
- Groceries: consider more category keywords or reference table entries based on usage.
- Optional: formal design/PRD or deployment docs under `docs/`.

## Workspace conventions

- **`.cursor/rules/`** — Global rules (output format, coding standards, architecture, security, testing, tooling, DB preferences, TS/React/Node/Docker, etc.).
- **`.cursor/agents/`** — Role-specific agents (backend, frontend, PM, QA, DevOps, security, etc.).

---

*Update this file when you make significant progress so the next handoff stays accurate.*
