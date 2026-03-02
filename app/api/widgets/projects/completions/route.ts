import { NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const householdUserId = await getHouseholdUserId();

    const completions = await prisma.projectTodo.findMany({
      where: {
        userId: householdUserId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json(completions);
  } catch (error) {
    console.error("Projects completions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions" },
      { status: 500 }
    );
  }
}
