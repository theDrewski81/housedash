import { NextResponse } from "next/server";
import { getHouseholdUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import { UserStatus } from "@prisma/client";

/**
 * Active users without a kiosk token (real household accounts), for project todo Owner dropdown.
 */
export async function GET() {
  try {
    await getHouseholdUserId();

    const users = await prisma.user.findMany({
      where: {
        status: UserStatus.active,
        kioskToken: null,
      },
      select: {
        id: true,
        firstName: true,
      },
      orderBy: [{ firstName: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Assignable owners API error:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}
