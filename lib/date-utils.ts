/**
 * Parses a calendar date string (yyyy-MM-dd) to a Date at noon UTC.
 * Noon avoids timezone shifts making the calendar day appear as the previous/next day.
 */
export function parseCalendarDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}

/**
 * Returns the UTC Date for 00:00:00.000 on the given calendar day in the given IANA timezone.
 * Uses noon UTC to get an in-day instant, then normalizes to midnight in TZ (handles DST).
 */
export function getStartOfDayInTimezone(dateStr: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return new Date(`${dateStr}T00:00:00.000Z`);
  const [, y, m, d] = match;
  const yNum = parseInt(y!, 10);
  const mNum = parseInt(m!, 10) - 1;
  const dNum = parseInt(d!, 10);
  const noonUtc = Date.UTC(yNum, mNum, dNum, 12, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(noonUtc));
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const second = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);
  let t = noonUtc - (hour * 3600 + minute * 60 + second) * 1000;
  const parts2 = formatter.formatToParts(new Date(t));
  const h2 = parseInt(parts2.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m2 = parseInt(parts2.find((p) => p.type === "minute")?.value ?? "0", 10);
  const s2 = parseInt(parts2.find((p) => p.type === "second")?.value ?? "0", 10);
  return new Date(t - (h2 * 3600 + m2 * 60 + s2) * 1000);
}

/**
 * Returns the UTC Date for 23:59:59.999 on the given calendar day in the given IANA timezone.
 * Uses start of next day in TZ minus 1ms so DST is respected.
 */
export function getEndOfDayInTimezone(dateStr: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return new Date(`${dateStr}T23:59:59.999Z`);
  const [, y, m, d] = match;
  const yNum = parseInt(y!, 10);
  const mNum = parseInt(m!, 10) - 1;
  const dNum = parseInt(d!, 10);
  const nextDay = new Date(Date.UTC(yNum, mNum, dNum + 1));
  const nextStr =
    nextDay.getUTCFullYear() +
    "-" +
    String(nextDay.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(nextDay.getUTCDate()).padStart(2, "0");
  const startOfNext = getStartOfDayInTimezone(nextStr, timezone);
  return new Date(startOfNext.getTime() - 1);
}

/**
 * Returns the local date key (yyyy-MM-dd) for a given Date in the given IANA timezone.
 */
export function getDateKeyInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

/**
 * Adds a number of calendar days to a yyyy-MM-dd string and returns the new yyyy-MM-dd.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, y, m, d] = match;
  const next = new Date(Date.UTC(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10) + days));
  return (
    next.getUTCFullYear() +
    "-" +
    String(next.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(next.getUTCDate()).padStart(2, "0")
  );
}
