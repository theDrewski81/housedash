/**
 * Resolve a location string (city, state or zip) to lat/lon via OpenWeather Geocoding API.
 * Returns first result or null if not found or on API error.
 */
export async function geocodeLocation(
  query: string
): Promise<{ lat: number; lon: number; name: string } | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not set");
  }

  const trimmed = query.trim();
  if (!trimmed) return null;

  const zipMatch = trimmed.match(/^(\d{5})(-\d{4})?(\s*,\s*([A-Za-z]{2}))?$/);
  if (zipMatch) {
    const zipPart = zipMatch[1] + (zipMatch[2] ?? "");
    const country = zipMatch[4]?.trim().toUpperCase() ?? "US";
    const zipParam = `${zipPart},${country}`;
    const url = `https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(zipParam)}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lat?: number;
      lon?: number;
      name?: string;
      zip?: string;
    };
    if (
      typeof data?.lat !== "number" ||
      typeof data?.lon !== "number"
    ) {
      return null;
    }
    return {
      lat: data.lat,
      lon: data.lon,
      name: data.name ?? `${data.zip ?? trimmed}`,
    };
  }

  const commaCount = (trimmed.match(/,/g) ?? []).length;
  const directQuery =
    commaCount <= 1 ? `${trimmed},US` : trimmed;
  const directUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(directQuery)}&limit=1&appid=${apiKey}`;
  const directRes = await fetch(directUrl);
  if (!directRes.ok) return null;
  const list = (await directRes.json()) as Array<{
    lat?: number;
    lon?: number;
    name?: string;
    state?: string;
    country?: string;
  }>;
  const first = list?.[0];
  if (
    !first ||
    typeof first.lat !== "number" ||
    typeof first.lon !== "number"
  ) {
    return null;
  }
  const name =
    ([first.name, first.state, first.country].filter(Boolean).join(", ") ||
      first.name) ?? trimmed;
  return {
    lat: first.lat,
    lon: first.lon,
    name,
  };
}
