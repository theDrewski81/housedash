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

    const income = await prisma.budgetIncome.update({
      where: {
        id,
        userId: householdUserId,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const householdUserId = await getHouseholdUserId();

    await prisma.budgetIncome.delete({
      where: {
        id,
        userId: householdUserId,
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
