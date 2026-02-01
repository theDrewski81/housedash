import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: any = { userId: user.id };
    if (category) {
      where.category = category;
    }

    const groceries = await prisma.grocery.findMany({
      where,
      orderBy: [{ category: "asc" }, { itemName: "asc" }],
    });

    return NextResponse.json(groceries);
  } catch (error) {
    console.error("Groceries API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch groceries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const grocery = await prisma.grocery.create({
      data: {
        userId: user.id,
        itemName: body.itemName,
        category: body.category || "Other",
        quantity: body.quantity || null,
      },
    });

    return NextResponse.json(grocery);
  } catch (error) {
    console.error("Groceries API error:", error);
    return NextResponse.json(
      { error: "Failed to create grocery item" },
      { status: 500 }
    );
  }
}
