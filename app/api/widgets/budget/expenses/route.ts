import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: { userId: string; category?: string } = { userId: householdUserId };
    if (category) where.category = category;

    const expenses = await prisma.budgetExpense.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Budget expenses GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();

    const expense = await prisma.budgetExpense.create({
      data: {
        userId: householdUserId,
        category: body.category ?? "ad_hoc",
        source: body.source,
        amount: body.amount,
        dueDate: new Date(body.dueDate),
        paidAmount: body.paidAmount ?? 0,
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        balance: body.balance ?? 0,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Budget expenses POST error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
