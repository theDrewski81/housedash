import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    const items = await prisma.dinnerRotation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Dinner rotation API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rotation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const item = await prisma.dinnerRotation.create({
      data: {
        userId: user.id,
        mealName: body.mealName,
        description: body.description ?? null,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Dinner rotation API error:", error);
    return NextResponse.json(
      { error: "Failed to add to rotation" },
      { status: 500 }
    );
  }
}
