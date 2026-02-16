# Plan: Fix weather settings save and use named location

**Preserve:** Settings option for weather location exists and remains in the admin menu.

**Fix:**
1. Saving returns "Failed to update settings" regardless of input.
2. Location should be a named location (city, state) or zip code, not lat/long.

---

## 1. Fix Save so it does not return errors

### Root cause
The PATCH handler returns 500 with a generic message when any error is thrown. The most likely cause is that the `app_config` table is missing `weather_lat` and `weather_lon` because the migration `20250215000000_add_weather_location_to_app_config` was not applied on the environment where Save is used. Prisma then throws when updating or when reading the updated row (e.g. "column \"weather_lat\" of relation \"app_config\" does not exist").

### Code fixes

**1.1 Return actionable error details from the API**

- **File:** `app/api/admin/settings/route.ts`
- In the PATCH `catch` block, return a JSON body that includes the actual error so the client can show it:
  - `NextResponse.json({ error: "Failed to update settings", details: error instanceof Error ? error.message : String(error) }, { status: 500 })`
- This allows the client (or logs) to show messages like "column weather_lat does not exist", so an admin knows to run migrations.

**1.2 Show server error on the settings page**

- **File:** `app/dashboard/admin/settings/page.tsx`
- When `!res.ok`, set the displayed error from the response body: use `data.details ?? data.error ?? "Failed to update settings"` so the user sees the server-provided reason (e.g. migration missing).

**1.3 Ensure migration is applied**

- No code change. As part of deploy or first-time setup, run:
  - `npx prisma migrate deploy` (or `npm run db:migrate:deploy`)
- so that `app_config` has columns `weather_lat` and `weather_lon`. If Save still fails after the named-location changes below, the returned `details` will confirm whether the failure is due to missing columns.

---

## 2. Use named location (city, state or zip) for user input

### 2a. User input

- **Replace** the two number inputs (latitude, longitude) with a **single text input** for "Location".
- **Accept:**
  - **City, state** (e.g. "Seattle, WA") or **city, state, country** (e.g. "Seattle, WA, US", "London, GB").
  - **ZIP code** (e.g. "98101" or "98101, US").
- **Heuristic** to choose API:
  - If the trimmed value matches a zip pattern (e.g. 5 digits, or 5 digits + optional `,CC`), use the OpenWeather **zip** geocoding endpoint.
  - Otherwise use the **direct** (city name) geocoding endpoint.
- **Hint:** e.g. "Enter city and state (e.g. Seattle, WA) or ZIP code (e.g. 98101). Leave empty for default (New York City)."
- **Storage:** Store the display string so the form can show it when loading (see schema below). Continue to store and use lat/lon for the weather API.

### 2b. OpenWeather and conversion to lat/long

- The **weather** APIs (current and forecast) accept only **lat** and **lon**. So named location must be converted to coordinates.
- OpenWeather provides a **Geocoding API** (same API key as weather):
  - **Direct (by location name):**  
    `GET http://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit=1&appid={API key}`
  - **By zip:**  
    `GET http://api.openweathermap.org/geo/1.0/zip?zip={zip code},{country code}&appid={API key}`
- **Strategy:** Resolve the named location to lat/lon **when the admin saves**, then store both the display name and the coordinates. The weather widget and weather API route keep using the stored lat/lon (no extra geocode call on every weather fetch).

**Flow when admin clicks Save:**

1. If the location field is **empty:** clear `weather_location_name`, `weather_lat`, and `weather_lon` in AppConfig.
2. If **non-empty:**  
   - Call the Geocoding API (direct or zip by heuristic).  
   - If no results or API error: return **400** with a message like "Location not found. Try 'City, State' or a ZIP code."  
   - If at least one result: save `weather_location_name` (e.g. "Seattle, WA" or the returned `name`), `weather_lat`, and `weather_lon` from the first result.

No change to the weather widget or to the weather API route; they continue to read `weatherLat`/`weatherLon` from config.

---

## 3. Implementation checklist

### Schema and config

| Step | File / action |
|------|----------------|
| Add nullable string for display name | `prisma/schema.prisma`: add `weatherLocationName String? @map("weather_location_name")` to `AppConfig`. |
| New migration | Create migration (e.g. `add_weather_location_name_to_app_config`) that adds column `weather_location_name` to `app_config`. |
| App config layer | `lib/app-config.ts`: extend `getAppConfig()` return type and query to include `weatherLocationName`; in `ensureAppConfig()` create branch include the new field if needed. |

### Geocoding

| Step | File / action |
|------|----------------|
| Geocode helper | New `lib/api/geocode.ts`: `geocodeLocation(query: string): Promise<{ lat: number; lon: number; name: string } | null>`. Use `OPENWEATHER_API_KEY`. If query matches zip pattern (e.g. `/^\d{5}(-\d{4})?(\s*,\s*[A-Za-z]{2})?$/` or simple "5 digits" + optional ",CC"), call zip API; else call direct API with `q=query&limit=1`. Return first result or null. Handle API errors (4xx/5xx) and return null or throw with a clear message. |

### Admin settings API

| Step | File / action |
|------|----------------|
| GET | `app/api/admin/settings/route.ts`: ensure response includes `weatherLocationName` (from `getAppConfig()`). |
| PATCH | Accept `weatherLocation` (string) instead of `weatherLat`/`weatherLon`. If `weatherLocation` is provided and non-empty: validate length (e.g. max 200 chars), call `geocodeLocation(weatherLocation)`; on null return 400 "Location not found..."; on success update `weather_location_name`, `weather_lat`, `weather_lon`. If `weatherLocation` is empty (or the key is present and empty): set all three to null. Keep existing handling for `allowAccountCreation` and `auditUserCrud`. In catch block return `{ error, details }` as in section 1.1. |

### Admin UI

| Step | File / action |
|------|----------------|
| Settings page | `app/dashboard/admin/settings/page.tsx`: replace lat/lon state and inputs with a single `weatherLocation` string state and one text input. On load, set `weatherLocation` from `weatherLocationName`. On submit, send `{ weatherLocation: weatherLocation.trim() || null }`. Display error using `data.details ?? data.error ?? "Failed to update settings"`. Update hint text as in 2a. |

### What stays the same

- **Weather API route** (`app/api/widgets/weather/route.ts`): no change; still uses `weatherLat`/`weatherLon` from `getAppConfig()`.
- **Weather widget**: no change.
- **Admin nav**: Settings link unchanged.

---

## 4. Verify after implementation

- **Save (no spurious failure):** With migration applied, set location to a valid name (e.g. "Seattle, WA"), click Save → success. Clear location, Save → success. If migration is not applied, Save should show an error message that mentions the missing column or Prisma.
- **Named location:** Enter "Seattle, WA" or "98101", Save → success; dashboard weather reflects that location. Enter an invalid string → 400 with "Location not found" (or similar).
- **Preserve:** Other admin settings (e.g. allow account creation, audit log toggle) still save correctly. Weather widget still shows data when a location is configured.
