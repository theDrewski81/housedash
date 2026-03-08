/**
 * Timezone evaluation utilities for Weather, Calendar, and Dinner widgets.
 * Use to compare client local time vs server/timezone assumptions.
 */

export interface ClientTimeContext {
  timezone: string;
  now: Date;
  todayKey: string; // yyyy-MM-dd in local time
  nowISO: string;
}

export interface ServerTimeContext {
  serverNow: string;
  serverTodayUTC: string;
}

export interface TimeContextComparison {
  client: ClientTimeContext;
  server: ServerTimeContext;
  /** True if client's local "today" matches server's UTC "today" */
  sameCalendarDay: boolean;
  /** Client today vs server today (for logging) */
  clientTodayVsServerToday: string;
}

/** Get the client's local time context (browser). */
export function getClientTimeContext(): ClientTimeContext {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: timezone }); // yyyy-MM-dd
  return {
    timezone,
    now,
    todayKey,
    nowISO: now.toISOString(),
  };
}

/** Fetch server time context and return comparison with client. */
export async function getTimeContextComparison(): Promise<TimeContextComparison> {
  const client = getClientTimeContext();
  const res = await fetch("/api/debug/time-context");
  if (!res.ok) throw new Error("Failed to fetch time context");
  const server: ServerTimeContext = await res.json();
  const sameCalendarDay = client.todayKey === server.serverTodayUTC;
  return {
    client,
    server,
    sameCalendarDay,
    clientTodayVsServerToday: `${client.todayKey} vs ${server.serverTodayUTC}`,
  };
}
