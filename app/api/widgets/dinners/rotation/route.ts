import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

function isMissingTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /relation "dinner_rotations" does not exist|Table.*dinner_rotations.*doesn't exist/i.test(msg);
}

function dedupeRotationByMealName<T extends { mealName: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.mealName.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  try {
    const householdUserId = await getHouseholdUserId();
    const items = await prisma.dinnerRotation.findMany({
      where: { userId: householdUserId },
      orderBy: { createdAt: "asc" },
    });
    const deduped = dedupeRotationByMealName(items);
    return NextResponse.json(deduped);
  } catch (error) {
    console.error("Dinner rotation API error:", error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Rotation not available. Run database migrations." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch rotation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();
    const item = await prisma.dinnerRotation.create({
      data: {
        userId: householdUserId,
        mealName: body.mealName,
        description: body.description ?? null,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Dinner rotation API error:", error);
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: "Rotation not available. Run database migrations." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add to rotation" },
      { status: 500 }
    );
  }
}
