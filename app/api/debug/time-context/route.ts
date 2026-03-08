import { NextResponse } from "next/server";

/**
 * Returns server's notion of "now" and "today" (UTC) for timezone evaluation.
 * Client can compare with browser local time to detect UTC vs local mismatches.
 */
export async function GET() {
  const serverNow = new Date();
  const serverTodayUTC =
    serverNow.getUTCFullYear() +
    "-" +
    String(serverNow.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(serverNow.getUTCDate()).padStart(2, "0");
  return NextResponse.json({
    serverNow: serverNow.toISOString(),
    serverTodayUTC,
  });
}
