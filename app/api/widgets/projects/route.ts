import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import {
  parseOwnerUserIdFromBody,
  projectTodoWithOwnerInclude,
  serializeProjectTodo,
  validateOwnerUserIdOrNull,
} from "@/lib/project-todo-api";
import { prisma } from "@/lib/db/prisma";
import { ProjectTodoStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const { searchParams } = new URL(request.url);
    const countsOnly = searchParams.get("counts") === "true";

    if (countsOnly) {
      const counts = await prisma.projectTodo.groupBy({
        by: ["status"],
        where: { userId: householdUserId },
        _count: { id: true },
      });
      const result: Record<string, number> = {
        NOT_READY: 0,
        STARTING: 0,
        IN_PROGRESS: 0,
        COMPLETE: 0,
      };
      for (const row of counts) {
        result[row.status] = row._count.id;
      }
      return NextResponse.json(result);
    }

    const todos = await prisma.projectTodo.findMany({
      where: { userId: householdUserId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: projectTodoWithOwnerInclude,
    });

    return NextResponse.json(todos.map(serializeProjectTodo));
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const priority = [1, 2, 3].includes(Number(body.priority))
      ? Number(body.priority)
      : 2;
    const statusRaw = body.status;
    const status =
      statusRaw === "STARTING"
        ? ProjectTodoStatus.STARTING
        : statusRaw === "IN_PROGRESS"
          ? ProjectTodoStatus.IN_PROGRESS
          : statusRaw === "COMPLETE"
            ? ProjectTodoStatus.COMPLETE
            : ProjectTodoStatus.NOT_READY;

    const bodyRecord = body as Record<string, unknown>;
    const ownerPatch = parseOwnerUserIdFromBody(bodyRecord);
    if (ownerPatch.mode === "invalid") {
      return NextResponse.json(
        { error: "Invalid ownerUserId" },
        { status: 400 }
      );
    }
    const ownerUserId =
      ownerPatch.mode === "omit" ? null : ownerPatch.value;
    const ownerCheck = await validateOwnerUserIdOrNull(ownerUserId);
    if (!ownerCheck.ok) {
      return NextResponse.json(
        { error: ownerCheck.message },
        { status: 400 }
      );
    }

    const todo = await prisma.projectTodo.create({
      data: {
        userId: householdUserId,
        ownerUserId,
        title,
        priority,
        initialPriority: priority,
        status,
        completedAt: status === ProjectTodoStatus.COMPLETE ? new Date() : null,
      },
      include: projectTodoWithOwnerInclude,
    });

    return NextResponse.json(serializeProjectTodo(todo));
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
