import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import {
  parseCalendarDate,
  getStartOfDayInTimezone,
  getEndOfDayInTimezone,
} from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const timezone = searchParams.get("timezone"); // IANA e.g. America/Los_Angeles; if set, start/end are local dates in this TZ

    const where: { userId: string; date?: { gte: Date; lte: Date } } = {
      userId: householdUserId,
    };
    if (startDate && endDate) {
      if (timezone) {
        where.date = {
          gte: getStartOfDayInTimezone(startDate, timezone),
          lte: getEndOfDayInTimezone(endDate, timezone),
        };
      } else {
        where.date = {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        };
      }
    }

    const dinners = await prisma.dinner.findMany({
      where,
      orderBy: [{ date: "asc" }, { orderIndex: "asc" }],
    });

    return NextResponse.json(dinners);
  } catch (error) {
    console.error("Dinners API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dinners" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();

    const dinner = await prisma.dinner.create({
      data: {
        userId: householdUserId,
        date: parseCalendarDate(body.date),
        mealName: body.mealName,
        description: body.description || null,
        url: body.url || null,
        ingredients: body.ingredients || null,
        orderIndex: body.orderIndex || 0,
        linkedDinnerId: body.linkedDinnerId || null,
      },
    });

    return NextResponse.json(dinner);
  } catch (error) {
    console.error("Dinners API error:", error);
    return NextResponse.json(
      { error: "Failed to create dinner" },
      { status: 500 }
    );
  }
}
