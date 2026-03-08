import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import {
  getStartOfDayInTimezone,
  addDaysToDateStr,
} from "@/lib/date-utils";

const RECENT_DAYS = 7;

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const { searchParams } = new URL(request.url);
    const asOf = searchParams.get("asOf"); // yyyy-MM-dd, optional; defaults to server date
    const timezone = searchParams.get("timezone"); // IANA; if set with asOf, asOf is interpreted as local date in this TZ

    let todayStart: Date;
    let sevenDaysAgo: Date;

    if (timezone && asOf) {
      todayStart = getStartOfDayInTimezone(asOf, timezone);
      sevenDaysAgo = getStartOfDayInTimezone(addDaysToDateStr(asOf, -RECENT_DAYS), timezone);
    } else {
      const today = asOf ? new Date(`${asOf}T12:00:00.000Z`) : new Date();
      todayStart = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - RECENT_DAYS);
    }

    const dinners = await prisma.dinner.findMany({
      where: {
        userId: householdUserId,
        date: {
          gte: sevenDaysAgo,
          lt: todayStart,
        },
      },
      orderBy: [{ date: "desc" }, { orderIndex: "asc" }],
    });

    return NextResponse.json(dinners);
  } catch (error) {
    console.error("Dinners recent API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent dinners" },
      { status: 500 }
    );
  }
}
