# housedash

Household dashboard: weather, schedule, dinners, groceries, and budget. Sign in with Google; optional kiosk mode for a tablet.

**Stack:** Next.js 14, React, Tailwind, Prisma (PostgreSQL), NextAuth. Optional: OpenWeatherMap, Google Calendar.

## Prerequisites

- Node 20+ (see lockfile)
- PostgreSQL (or use Docker for DB only)
- Google OAuth credentials (for sign-in)
- Optional: OpenWeatherMap key, Google Calendar API key, kiosk token (tablet)

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` (e.g. `postgresql://postgres:postgres@localhost:5432/housedash`)
   - Set `NEXTAUTH_URL` (e.g. `http://localhost:3000`), `NEXTAUTH_SECRET`, and Google OAuth vars
   - Add API keys and `KIOSK_TOKEN` as needed (see [Kiosk setup](docs/KIOSK-SETUP.md))

3. **Database**
   ```bash
   npm run db:generate
   npm run db:push
   ```
   Or use migrations: `npm run db:migrate`

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign in with Google or use kiosk on a tablet.

## Docker

Run app + Postgres with Docker Compose:

```bash
docker compose up -d
```

**Run DB migrations** (e.g. after first deploy or schema changes; uses the same `DATABASE_URL` as the app). Build the migrate image first (Debian-based so Prisma runs correctly), then run:

```bash
docker compose build migrate
docker compose --profile tools run --rm migrate
```

Set required env vars (e.g. in `.env` at repo root) before starting. App is on port 3000; DB on 5432.

## Scripts

| Script        | Purpose                |
|---------------|------------------------|
| `npm run dev` | Dev server              |
| `npm run build` | Production build     |
| `npm run start` | Run production build |
| `npm run lint` | ESLint                 |
| `npm run db:studio` | Prisma Studio (DB UI) |
| `npm run db:push` | Push schema (no migrations) |
| `npm run db:migrate` | Create/run migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (prod; use when Node is installed locally) |

## Troubleshooting: login sends me back to the login screen

If you sign in with Google but end up on the login page again:

1. **NEXTAUTH_URL must match the browser URL**  
   Set `NEXTAUTH_URL` in `.env` to the **exact** URL you use to open the app (no trailing slash).  
   - Local: `http://localhost:3000`  
   - Cloudflare Tunnel: `https://your-tunnel-host.trycloudflare.com`  
   If you use a tunnel but leave `NEXTAUTH_URL=http://localhost:3000`, the session cookie will not match and you’ll be sent back to login.

2. **Google OAuth redirect URI**  
   In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth 2.0 Client ID → **Authorized redirect URIs**, add exactly:  
   `{NEXTAUTH_URL}/api/auth/callback/google`  
   Example for a tunnel: `https://your-tunnel-host.trycloudflare.com/api/auth/callback/google`

3. **Restart the app** after changing `.env` so the new `NEXTAUTH_URL` is picked up.

## Docs

- [Kiosk setup (tablet)](docs/KIOSK-SETUP.md) — `KIOSK_TOKEN`, link user, tablet vs phone behavior.
