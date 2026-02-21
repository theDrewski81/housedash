import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    await prisma.dinnerRotation.delete({
      where: {
        id,
        userId: user.id,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dinner rotation API error:", error);
    return NextResponse.json(
      { error: "Failed to remove from rotation" },
      { status: 500 }
    );
  }
}
