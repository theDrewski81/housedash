import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await requireAuth();

    const completions = await prisma.projectTodo.findMany({
      where: {
        userId: user.id,
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
