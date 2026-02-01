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

    const income = await prisma.budgetIncome.update({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        ...(body.source && { source: body.source }),
        ...(body.expectedPay !== undefined && { expectedPay: body.expectedPay }),
        ...(body.frequencyType && { frequencyType: body.frequencyType }),
        ...(body.frequencyValue !== undefined && {
          frequencyValue: body.frequencyValue,
        }),
        ...(body.frequencyDays && { frequencyDays: body.frequencyDays }),
      },
    });

    return NextResponse.json(income);
  } catch (error) {
    console.error("Budget Income API error:", error);
    return NextResponse.json(
      { error: "Failed to update income" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    await prisma.budgetIncome.delete({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget Income API error:", error);
    return NextResponse.json(
      { error: "Failed to delete income" },
      { status: 500 }
    );
  }
}
