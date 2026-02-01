import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/api/calendar";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || "primary";

    const schedule = await getCalendarEvents(calendarId);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
