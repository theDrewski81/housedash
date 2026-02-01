import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (token !== process.env.KIOSK_TOKEN) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Find or create a kiosk user
    const kioskUser = await prisma.user.findUnique({
      where: { kioskToken: token },
    });

    if (!kioskUser) {
      return NextResponse.json(
        { error: "Kiosk user not found" },
        { status: 404 }
      );
    }

    // Create a session for the kiosk user
    // In a real implementation, you'd create a proper session
    // For now, we'll return the user ID and let the client handle it
    return NextResponse.json({
      userId: kioskUser.id,
      email: kioskUser.email,
      name: kioskUser.name,
    });
  } catch (error) {
    console.error("Kiosk auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
