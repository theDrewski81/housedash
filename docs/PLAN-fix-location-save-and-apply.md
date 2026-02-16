# Plan: Fix location save and apply to weather widget

**Preserve:** No error on opening settings; weather widget correctly shows default location.

**Problem:** Changing location (city, state or zip) fails with: "Invalid `prisma.appConfig.upsert()` invocation: The column `weather_lat` does not exist in the current database." So the user cannot save a location and the widget never uses a custom one.

**Goal:** Devise a way to find locations and appropriately apply them to the weather widget.

---

## Root cause

- **Finding locations:** Geocoding (city/state and zip) already works; the blocker is not geocode.
- **Applying to the widget:** Saving writes `weather_lat`, `weather_lon`, `weather_location_name` to `app_config`. The weather API and widget read from `getAppConfig()` and use those coordinates. So once a location is saved, the widget uses it. The only blocker is that the database does not have those columns until migrations are run.
- **Why the user sees a raw error:** The API correctly returns 503 with a friendly `error` and raw `details`. The settings page displays `data.details ?? data.error`, so the raw Prisma message (in `details`) is shown instead of the friendly message (in `error`).

---

## 1. Show friendly error when save fails (schema out of date)

**File:** `app/dashboard/admin/settings/page.tsx`

**Change:** When the PATCH response is not ok, set the displayed error from the API body so the **user-facing message** is shown first:
- Use `data.error ?? data.details ?? "Failed to update settings"` instead of `data.details ?? data.error ?? "Failed to update settings"`.

**Result:** When the DB is missing the weather columns, the user sees: "Database schema is out of date. Run migrations to save weather location (see README Docker section)." instead of the raw Prisma invocation error.

---

## 2. Proactive “migrations required” on Settings page

**Goal:** So the user knows they must run migrations before they can save a location, and so they know what to do.

**New endpoint:** `GET /api/admin/settings/schema-status`

- **Auth:** Require admin (same as GET settings).
- **Behavior:** Determine if the `app_config` table has the weather columns. Use a single raw query that only succeeds when the columns exist, e.g. `prisma.$queryRaw` with `SELECT "weather_lat" FROM app_config LIMIT 1`. If the query throws (e.g. column does not exist), return `{ weatherLocationSupported: false }`. Otherwise return `{ weatherLocationSupported: true }`.
- **Response:** `{ weatherLocationSupported: boolean }`.

**File:** New route at `app/api/admin/settings/schema-status/route.ts`.

**Settings page:** After loading settings (or in the same flow), call this endpoint. If `weatherLocationSupported === false`, show a short, non-blocking banner above the Weather location form, e.g.: "Migrations required to save weather location. See README Docker section to run migrations." No change to existing form behavior.

**Result:** Users see upfront that they need to run migrations to save location; after they run the deploy steps (including migrate), the banner goes away and saving works.

---

## 3. How locations apply to the widget (no code change)

- Admin enters city/state or zip and clicks Save.
- PATCH geocodes the input, then upserts `weather_lat`, `weather_lon`, `weather_location_name` into `app_config` (once migrations have been run).
- The weather widget calls `GET /api/widgets/weather` with no query params. The weather route uses `getAppConfig()` and, when present, uses `weatherLat`/`weatherLon` for the OpenWeather request. So the widget automatically shows the saved location. No change needed here; ensuring migrations run and the UI messaging (sections 1 and 2) is the fix.

---

## 4. Deploy / README

README already documents the correct order: start postgres → run migrate → start app. No change required. After deploy with that order, `app_config` has the weather columns, so saving a location works and the widget uses it.

---

## 5. Implementation checklist

| Step | File / action |
|------|----------------|
| 1 | `app/dashboard/admin/settings/page.tsx`: On PATCH error response, use `data.error ?? data.details ?? "Failed to update settings"` for the displayed error message. |
| 2 | New `app/api/admin/settings/schema-status/route.ts`: GET, require admin; run a raw query that touches `weather_lat` (e.g. `SELECT "weather_lat" FROM app_config LIMIT 1`); on success return `{ weatherLocationSupported: true }`, on throw return `{ weatherLocationSupported: false }`. |
| 3 | `app/dashboard/admin/settings/page.tsx`: Call GET `/api/admin/settings/schema-status` when loading (e.g. after or alongside settings load). If `weatherLocationSupported === false`, show a banner above the Weather location section with the migrations message. |

---

## 6. Verify

- **Preserve:** Opening Settings still works; weather widget still shows default location when no custom location is set.
- **Friendly error:** With migrations not run, saving a location shows the “Database schema is out of date…” message, not the raw Prisma error.
- **Banner:** With migrations not run, Settings shows the “Migrations required…” banner; after running migrations and reloading, the banner is gone.
- **Apply to widget:** After migrations are run, saving a city/state or zip persists the location and the weather widget displays weather for that location.
