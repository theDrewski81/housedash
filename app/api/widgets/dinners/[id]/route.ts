import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    const dinner = await prisma.dinner.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        ...(body.mealName && { mealName: body.mealName }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.url !== undefined && { url: body.url || null }),
        ...(body.ingredients !== undefined && {
          ingredients: body.ingredients || null,
        }),
        ...(body.isComplete !== undefined && { isComplete: body.isComplete }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.linkedDinnerId !== undefined && {
          linkedDinnerId: body.linkedDinnerId,
        }),
      },
    });

    return NextResponse.json(dinner);
  } catch (error) {
    console.error("Dinners API error:", error);
    return NextResponse.json(
      { error: "Failed to update dinner" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    await prisma.dinner.delete({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dinners API error:", error);
    return NextResponse.json(
      { error: "Failed to delete dinner" },
      { status: 500 }
    );
  }
}
