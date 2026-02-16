# Plan: Fix settings load, city/state geocode, and zip/DB errors

**Problems:**
1. Opening location settings shows "Failed to load settings" (GET fails).
2. Entering "city, state" shows "Location not found. Try 'City, State' or a ZIP code."
3. Entering a zip code triggers: "The column `weather_lat` does not exist in the current database."

**Goals:**
- Resolve the error on initially opening the settings.
- Ensure city, state inputs can resolve to a location.
- Ensure using a zip code yields a valid location and no Prisma/DB errors.

---

## 1. Resolve "Failed to load settings" on open

**Cause:** GET `/api/admin/settings` calls `getAppConfig()`, which runs `prisma.appConfig.findUnique()`. The Prisma client expects columns `weather_lat`, `weather_lon`, `weather_location_name`. If those columns are missing (migrations not applied), the database returns an error and the request fails with 500 "Failed to load settings".

**Fix:** Make `getAppConfig()` tolerant of a missing or outdated schema so the settings page can load even when weather columns are absent.

- **File:** `lib/app-config.ts`
- **Change:** Wrap the existing `getAppConfig()` body in try/catch. On success, return the row as today.
- **On error:** If the caught error looks like a missing-column / schema error (e.g. message includes `weather_lat` or `does not exist` or Prisma error code `P2010`/related), return a safe default config and log the error:
  - `{ allowAccountCreation: false, auditUserCrud: false, weatherLat: null, weatherLon: null, weatherLocationName: null }`
- **Result:** The settings page loads; the location field may be empty. If the user tries to save a location and the columns are still missing, the PATCH will still fail until migrations are run (handled in section 3).

---

## 2. Ensure "city, state" inputs can find data

**Cause:** OpenWeather’s direct geocoding API works best with a country code: `q={city},{state},{country}`. A query like "Seattle, WA" (no country) often returns no or fewer results.

**Fix:** When using the direct (city name) geocoding path, if the user’s input has no comma or only one comma (i.e. "City" or "City, State"), append a default country code before calling the API.

- **File:** `lib/api/geocode.ts`
- **Logic:** For the direct-API branch (non-zip):
  - If `trimmed` has 0 or 1 comma, build a query string: `trimmed + ",US"` (default US). Call the direct API with this query.
  - If `trimmed` already has two or more commas (e.g. "City, State, UK"), use `trimmed` as-is.
- **Result:** Inputs like "Seattle, WA" or "Boston, MA" become "Seattle, WA, US" / "Boston, MA, US" and are more likely to return a result. Keep existing behavior for full "City, State, Country" input.

---

## 3. Ensure zip code gives a good location and no errors

**Cause:** Two parts:
- **Geocode:** Zip path is already correct (regex + zip API); no change unless testing shows otherwise.
- **Prisma error:** Saving (PATCH) runs `prisma.appConfig.upsert()` including `weather_lat`, `weather_lon`, `weather_location_name`. If those columns don’t exist, the DB throws and the user sees the raw Prisma error.

**Fix (schema):** The only way to remove the "column does not exist" error is to apply migrations so `app_config` has `weather_lat`, `weather_lon`, and `weather_location_name`. The README already documents the deploy order (start postgres → run migrate → start app). No code change for that; ensure that order is followed.

**Fix (API):** When PATCH does fail due to schema, return a clear, actionable message instead of the raw Prisma message.

- **File:** `app/api/admin/settings/route.ts`
- **Change:** In the PATCH catch block, detect schema-related errors (e.g. message contains `weather_lat` or `does not exist` or `column`). For those, return **503** with a JSON body like:
  - `{ error: "Database schema is out of date. Run migrations to save weather location (see README Docker section).", details: error.message }`
- **Result:** For zip (or any location) save, if migrations haven’t been run, the user sees a single clear message and knows to run migrations. Once migrations are applied, zip and city/state saves both work and store a good location.

---

## 4. Implementation checklist

| Step | File | Action |
|------|------|--------|
| 1 | `lib/app-config.ts` | In `getAppConfig()`, try/catch around the Prisma call; on schema-related error, return default config (no weather fields) and log. |
| 2 | `lib/api/geocode.ts` | Before calling the direct geocoding API, if the query has 0 or 1 comma, append `",US"` and use that for the request. |
| 3 | `app/api/admin/settings/route.ts` | In PATCH catch, if error is schema-related (missing column), return 503 with the user-facing message above and optional `details`. |
| 4 | README / deploy | Confirm Docker section says to run migrate before starting the app so the DB has the weather columns. |

---

## 5. Verify after implementation

- **Open settings:** With or without migrations applied, the settings page loads (no "Failed to load settings"). If migrations are missing, location is empty.
- **City, state:** "Seattle, WA" or "Boston, MA" resolves and saves when migrations are applied.
- **Zip:** "98101" or "98101, US" resolves and saves when migrations are applied.
- **Save without migrations:** Saving a location when the schema is old returns 503 with the message to run migrations; no raw Prisma error.
- **After migrations:** Saving city, state or zip persists a good location and no errors.
