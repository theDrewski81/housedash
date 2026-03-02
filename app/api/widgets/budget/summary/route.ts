import { NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const householdUserId = await getHouseholdUserId();
    const [incomes, expenses] = await Promise.all([
      prisma.budgetIncome.findMany({
        where: { userId: householdUserId },
        select: { expectedPay: true },
      }),
      prisma.budgetExpense.findMany({
        where: { userId: householdUserId },
        select: { amount: true, paidAmount: true },
      }),
    ]);
    const incomeTotal = incomes.reduce((s, i) => s + Number(i.expectedPay), 0);
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const paidTotal = expenses.reduce((s, e) => s + Number(e.paidAmount), 0);
    return NextResponse.json({
      incomeTotal,
      expenseTotal,
      paidTotal,
      balance: incomeTotal - expenseTotal,
    });
  } catch (error) {
    console.error("Budget summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
