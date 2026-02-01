import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = { userId: user.id };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
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
    const user = await requireAuth();
    const body = await request.json();

    const dinner = await prisma.dinner.create({
      data: {
        userId: user.id,
        date: new Date(body.date),
        mealName: body.mealName,
        description: body.description || null,
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
