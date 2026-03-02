import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();

    const grocery = await prisma.grocery.update({
      where: {
        id,
        userId: householdUserId,
      },
      data: {
        ...(body.itemName && { itemName: body.itemName }),
        ...(body.category && { category: body.category }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.isComplete !== undefined && { isComplete: body.isComplete }),
      },
    });

    return NextResponse.json(grocery);
  } catch (error) {
    console.error("Groceries API error:", error);
    return NextResponse.json(
      { error: "Failed to update grocery item" },
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
    const householdUserId = await getHouseholdUserId();

    await prisma.grocery.delete({
      where: {
        id,
        userId: householdUserId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Groceries API error:", error);
    return NextResponse.json(
      { error: "Failed to delete grocery item" },
      { status: 500 }
    );
  }
}
