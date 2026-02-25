import { NextResponse } from "next/server";
import {
  getCalendarEvents,
  getCalendarEventsFromConfigs,
} from "@/lib/api/calendar";
import { getAppConfig } from "@/lib/app-config";

export async function GET(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Set GOOGLE_CALENDAR_API_KEY in .env for the Schedule widget.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get("timezone") ?? "UTC";
    const calendarIdOverride = searchParams.get("calendarId");

    const config = await getAppConfig();
    const calendarConfigs = config.calendarConfigs;

    let schedule;
    if (
      calendarConfigs &&
      calendarConfigs.length > 0 &&
      !calendarIdOverride
    ) {
      schedule = await getCalendarEventsFromConfigs(
        calendarConfigs,
        timezone
      );
    } else {
      const calendarId =
        calendarIdOverride || process.env.GOOGLE_CALENDAR_ID;
      if (!calendarId) {
        return NextResponse.json(
          {
            error:
              "Add calendars in Settings, or set GOOGLE_CALENDAR_ID in .env (use a public calendar ID).",
          },
          { status: 500 }
        );
      }
      schedule = await getCalendarEvents(calendarId, timezone);
    }

    return NextResponse.json(schedule);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar events";
    console.error("Calendar API error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
