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

export interface GetCalendarEventsOptions {
  /** OAuth access token for user's calendar (required for "primary") */
  accessToken?: string;
}

export async function getCalendarEvents(
  calendarId: string = "primary",
  options: GetCalendarEventsOptions = {}
): Promise<ScheduleData> {
  const { accessToken } = options;
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  if (accessToken) {
    // OAuth: use Bearer token (works for "primary" and user calendars)
  } else if (apiKey && calendarId !== "primary") {
    // API key: works only for public calendars (not "primary")
  } else {
    throw new Error(
      calendarId === "primary"
        ? "Sign in with Google to view your calendar, or set GOOGLE_CALENDAR_API_KEY and use a public calendar ID"
        : "GOOGLE_CALENDAR_API_KEY is not set"
    );
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
  });
  if (apiKey && !accessToken) {
    params.set("key", apiKey);
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
  const headers: HeadersInit = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const response = await fetch(url, { headers });
  const data = await response.json();

  if (!response.ok) {
    const msg =
      response.status === 401
        ? "Calendar access expired. Sign out and sign in again with Google."
        : (data?.error?.message as string) || "Failed to fetch calendar events";
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

  // Find next event
  const nextEvent =
    events.find((e) => {
      const eventDate = e.start.dateTime
        ? new Date(e.start.dateTime)
        : new Date(e.start.date!);
      return eventDate >= now;
    }) || null;

  // Group events by day
  const weeklyEventsMap: { [key: string]: CalendarEvent[] } = {};
  events.forEach((event) => {
    const eventDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date!);
    const dateKey = eventDate.toISOString().split("T")[0];

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
