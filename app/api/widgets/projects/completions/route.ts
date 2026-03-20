import { NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import {
  projectTodoWithOwnerInclude,
  serializeProjectTodo,
} from "@/lib/project-todo-api";
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
      include: projectTodoWithOwnerInclude,
    });

    return NextResponse.json(completions.map(serializeProjectTodo));
  } catch (error) {
    console.error("Projects completions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions" },
      { status: 500 }
    );
  }
}
