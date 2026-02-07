import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const expense = await prisma.budgetExpense.update({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        ...(body.category && { category: body.category }),
        ...(body.source && { source: body.source }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
        ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount }),
        ...(body.paidDate !== undefined && {
          paidDate: body.paidDate ? new Date(body.paidDate) : null,
        }),
        ...(body.balance !== undefined && { balance: body.balance }),
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Budget expense PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    await prisma.budgetExpense.delete({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget expense DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
