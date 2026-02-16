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

**First-time or after schema changes:** start Postgres, run migrations, then start the app (migrations must run before the app so the DB has the latest columns):

```bash
docker compose build --no-cache
docker compose up -d postgres
docker compose --profile tools run --rm migrate
docker compose up -d
```

**Already migrated:** `docker compose up -d`. Set required env vars (e.g. in `.env` at repo root). App is on port 3000; DB on 5432.

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

If you sign in with Google but end up on the login page again (sometimes with `?error=Callback` in the URL):

1. **NEXTAUTH_URL must match the browser URL**  
   Set `NEXTAUTH_URL` in `.env` to the **exact** URL you use to open the app (no trailing slash), e.g. `https://dash.susknet.com`. Restart the app after changing.

2. **Google OAuth redirect URI**  
   In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your OAuth 2.0 Client ID → **Authorized redirect URIs**, add exactly:  
   `https://dash.susknet.com/api/auth/callback/google` (or `{NEXTAUTH_URL}/api/auth/callback/google`).

3. **Reverse proxy must forward the public host**  
   The `error=Callback` often happens when the app receives a different `Host` than the public URL (e.g. internal hostname or `localhost`). Then the cookie set at sign-in is for the wrong domain and is not sent when Google redirects back.  
   Ensure your reverse proxy (nginx, Caddy, Cloudflare Tunnel, etc.) forwards to the app:
   - **Host**: the public hostname (e.g. `Host: dash.susknet.com`)
   - **X-Forwarded-Proto**: `https`
   - **X-Forwarded-Host**: `dash.susknet.com` (optional but recommended)  
   Example for **nginx** `proxy_pass`: `proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme;`  
   Example for **Caddy**: reverse_proxy usually sets these automatically.  
   Example for **Cloudflare Tunnel**: the tunnel forwards the original Host by default; if you proxy again behind it, that inner proxy must forward Host.

4. **See the exact error in logs**  
   Set `NEXTAUTH_DEBUG=1` in `.env`, restart the app, try signing in again, then run `docker compose logs app` (or `docker logs housedash-app`) and look for `[NextAuth]` lines. That will show the real cause (e.g. state mismatch, missing code_verifier, or adapter error).

### "The table `public.accounts` does not exist" (or other tables)

The database schema has not been applied. Run migrations (same `DATABASE_URL` as the app):

```bash
docker compose build migrate
docker compose --profile tools run --rm migrate
```

Then restart the app: `docker compose up -d --force-recreate app`.

If migrate says **"No migration found in prisma/migrations"**, the migrate image was built without the migrations folder (e.g. cached build). Rebuild the migrate image without cache so it copies the current repo (including `prisma/migrations/`), then run migrate again:

```bash
docker compose build --no-cache migrate
docker compose --profile tools run --rm migrate
```

If migrate says **"No pending migrations"** but the app still reports missing tables, the migration was recorded as applied but tables are missing (e.g. DB was recreated). You can re-apply by marking the migration as rolled back then deploying again (only if the migration was previously applied):

```bash
docker compose run --rm --entrypoint sh migrate -c "npx prisma migrate resolve --rolled-back 20250207000000_init && npx prisma migrate deploy"
```

## Docs

- [Kiosk setup (tablet)](docs/KIOSK-SETUP.md) — `KIOSK_TOKEN`, link user, tablet vs phone behavior.
