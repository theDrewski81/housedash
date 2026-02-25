export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
}

export interface ScheduleData {
  nextEvent: CalendarEvent | null;
  weeklyEvents: Array<{
    date: string;
    events: CalendarEvent[];
  }>;
}

/** Get local date key (YYYY-MM-DD) for a date in the given timezone */
function getDateKeyInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

export async function getCalendarEvents(
  calendarId: string,
  timezone = "UTC"
): Promise<ScheduleData> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_CALENDAR_API_KEY is not set");
  }

  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const timeMin = now.toISOString();
  const timeMax = weekFromNow.toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    key: apiKey,
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
  const baseUrl = process.env.NEXTAUTH_URL || "https://dash.susknet.com";
  const headers: HeadersInit = {
    Referer: `${baseUrl}/`,
  };

  const response = await fetch(url, { headers });
  const data = await response.json();

  if (!response.ok) {
    const msg =
      (data?.error?.message as string) ||
      "Failed to fetch calendar events. Ensure GOOGLE_CALENDAR_ID is a public calendar and GOOGLE_CALENDAR_API_KEY is valid.";
    throw new Error(msg);
  }

  const events: CalendarEvent[] = (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || "No title",
    description: item.description,
    start: item.start,
    end: item.end,
    location: item.location,
  }));

  // Find next event (first event that hasn't ended yet: ongoing or upcoming)
  const nextEvent =
    events.find((e) => {
      const endDate = e.end.dateTime
        ? new Date(e.end.dateTime)
        : new Date(e.end.date!);
      return endDate > now;
    }) || null;

  // Group events by day (use user timezone for correct local date)
  const weeklyEventsMap: { [key: string]: CalendarEvent[] } = {};
  events.forEach((event) => {
    const eventDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date!);
    const dateKey = getDateKeyInTimezone(eventDate, timezone);

    if (!weeklyEventsMap[dateKey]) {
      weeklyEventsMap[dateKey] = [];
    }
    weeklyEventsMap[dateKey].push(event);
  });

  const weeklyEvents = Object.entries(weeklyEventsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({
      date,
      events: events.sort((a, b) => {
        const aTime = a.start.dateTime
          ? new Date(a.start.dateTime).getTime()
          : 0;
        const bTime = b.start.dateTime
          ? new Date(b.start.dateTime).getTime()
          : 0;
        return aTime - bTime;
      }),
    }));

  return { nextEvent, weeklyEvents };
}
