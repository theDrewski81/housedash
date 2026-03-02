import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

const RECENT_DAYS = 7;

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const { searchParams } = new URL(request.url);
    const asOf = searchParams.get("asOf"); // yyyy-MM-dd, optional; defaults to server date

    const today = asOf
      ? new Date(`${asOf}T12:00:00.000Z`)
      : new Date();
    const todayStart = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      0,
      0,
      0,
      0
    ));
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - RECENT_DAYS);

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
