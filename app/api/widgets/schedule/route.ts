import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/api/calendar";
import { getGoogleAccessToken } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId =
      searchParams.get("calendarId") ||
      process.env.GOOGLE_CALENDAR_ID ||
      "primary";

    const accessToken =
      calendarId === "primary" ? await getGoogleAccessToken() : undefined;

    const schedule = await getCalendarEvents(calendarId, {
      accessToken: accessToken ?? undefined,
    });
    return NextResponse.json(schedule);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar events";
    console.error("Calendar API error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
