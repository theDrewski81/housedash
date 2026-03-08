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
    // #region agent log
    const serverTodayUTC =
      today.getUTCFullYear() +
      "-" +
      String(today.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getUTCDate()).padStart(2, "0");
    fetch("http://127.0.0.1:7832/ingest/c0ef89d9-077f-4a38-976e-46e2b7cf1042", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "79a07d" },
      body: JSON.stringify({
        sessionId: "79a07d",
        location: "app/api/widgets/dinners/recent/route.ts",
        message: "Dinners recent API: server today (or asOf) for range",
        data: { asOf: asOf ?? "(server now)", serverTodayUTC },
        timestamp: Date.now(),
        hypothesisId: "H1",
      }),
    }).catch(() => {});
    // #endregion
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
