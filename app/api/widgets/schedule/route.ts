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
    const timeMin = searchParams.get("timeMin"); // Client "now" as ISO; when set, window and next-event use client time
    const calendarIdOverride = searchParams.get("calendarId");

    // #region agent log
    const serverNow = new Date();
    fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "79a07d" },
      body: JSON.stringify({
        sessionId: "79a07d",
        location: "app/api/widgets/schedule/route.ts",
        message: "Schedule API: timezone param and server now",
        data: { timezone, serverNow: serverNow.toISOString(), timeMinUsed: !!timeMin },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
    // #endregion

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
        timezone,
        timeMin ?? undefined
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
      schedule = await getCalendarEvents(calendarId, timezone, timeMin ?? undefined);
    }

    return NextResponse.json(schedule);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar events";
    console.error("Calendar API error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
