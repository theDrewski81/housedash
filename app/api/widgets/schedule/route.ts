import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/api/calendar";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId =
      searchParams.get("calendarId") || process.env.GOOGLE_CALENDAR_ID;

    if (!calendarId) {
      return NextResponse.json(
        {
          error:
            "Set GOOGLE_CALENDAR_ID and GOOGLE_CALENDAR_API_KEY in .env for the Schedule widget (use a public calendar ID).",
        },
        { status: 500 }
      );
    }

    const schedule = await getCalendarEvents(calendarId);
    return NextResponse.json(schedule);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar events";
    console.error("Calendar API error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
