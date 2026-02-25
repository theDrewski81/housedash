import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import { ProjectTodoStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    const existing = await prisma.projectTodo.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const statusRaw = body.status;
    let newStatus: ProjectTodoStatus | undefined;
    if (statusRaw === "NOT_READY") newStatus = ProjectTodoStatus.NOT_READY;
    else if (statusRaw === "STARTING") newStatus = ProjectTodoStatus.STARTING;
    else if (statusRaw === "IN_PROGRESS")
      newStatus = ProjectTodoStatus.IN_PROGRESS;
    else if (statusRaw === "COMPLETE") newStatus = ProjectTodoStatus.COMPLETE;

    const priority = [1, 2, 3].includes(Number(body.priority))
      ? Number(body.priority)
      : undefined;

    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;

    const data: {
      title?: string;
      priority?: number;
      status?: ProjectTodoStatus;
      completedAt?: Date | null;
      initialPriority?: number;
    } = {};

    if (title !== undefined) data.title = title;
    if (priority !== undefined) data.priority = priority;
    if (newStatus !== undefined) {
      data.status = newStatus;
      if (newStatus === ProjectTodoStatus.COMPLETE) {
        data.completedAt = new Date();
        if (existing.initialPriority == null) {
          data.initialPriority = existing.priority;
        }
      } else {
        data.completedAt = null;
      }
    }

    const todo = await prisma.projectTodo.update({
      where: { id, userId: user.id },
      data,
    });

    return NextResponse.json(todo);
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    await prisma.projectTodo.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Projects API error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
