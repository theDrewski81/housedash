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
