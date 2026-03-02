import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();

    const incomes = await prisma.budgetIncome.findMany({
      where: { userId: householdUserId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(incomes);
  } catch (error) {
    console.error("Budget Income API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch income" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();

    const income = await prisma.budgetIncome.create({
      data: {
        userId: householdUserId,
        source: body.source,
        expectedPay: body.expectedPay,
        frequencyType: body.frequencyType,
        frequencyValue: body.frequencyValue,
        frequencyDays: body.frequencyDays,
      },
    });

    return NextResponse.json(income);
  } catch (error) {
    console.error("Budget Income API error:", error);
    return NextResponse.json(
      { error: "Failed to create income" },
      { status: 500 }
    );
  }
}
