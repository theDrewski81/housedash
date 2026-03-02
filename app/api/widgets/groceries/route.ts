import { NextRequest, NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import {
  itemsMatch,
  chooseItemName,
  mergeQuantity,
} from "@/lib/grocery-dedupe";
import { inferCategory } from "@/lib/grocery-refs";

export async function GET(request: NextRequest) {
  try {
    const householdUserId = await getHouseholdUserId();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: { userId: string; category?: string } = { userId: householdUserId };
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
    const householdUserId = await getHouseholdUserId();
    const body = await request.json();
    const itemName = (body.itemName ?? "").trim();
    const requestedCategory = body.category || "Other";
    const category =
      requestedCategory === "Other" ? inferCategory(itemName) : requestedCategory;
    const quantity = body.quantity?.trim() || null;

    if (!itemName) {
      return NextResponse.json(
        { error: "itemName is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.grocery.findMany({
      where: { userId: householdUserId },
    });

    const match = existing.find((g) => itemsMatch(g.itemName, itemName));

    if (match) {
      const mergedName = chooseItemName(match.itemName, itemName);
      const mergedQuantity = mergeQuantity(match.quantity, quantity);

      const grocery = await prisma.grocery.update({
        where: { id: match.id, userId: householdUserId },
        data: {
          itemName: mergedName,
          quantity: mergedQuantity,
        },
      });

      return NextResponse.json(grocery);
    }

    const grocery = await prisma.grocery.create({
      data: {
        userId: householdUserId,
        itemName,
        category,
        quantity,
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
