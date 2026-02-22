import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import { appendFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const user = await requireAuth();
    const items = await prisma.dinnerRotation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Dinner rotation API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rotation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const logPath = join(process.cwd(), "debug-05439c.log");
  const log = (loc: string, msg: string, data: object, hypothesisId: string) => {
    try {
      const line =
        JSON.stringify({
          sessionId: "05439c",
          location: loc,
          message: msg,
          data,
          timestamp: Date.now(),
          hypothesisId,
        }) + "\n";
      appendFileSync(logPath, line);
      console.error("[DEBUG rotation]", loc, msg, data);
    } catch (_) {}
  };
  try {
    const user = await requireAuth();
    const body = await request.json();
    // #region agent log
    log("rotation/route.ts:POST:entry", "API POST rotation", { mealName: body?.mealName?.slice(0, 30), userId: user?.id?.slice(0, 8) }, "F");
    // #endregion
    const item = await prisma.dinnerRotation.create({
      data: {
        userId: user.id,
        mealName: body.mealName,
        description: body.description ?? null,
      },
    });
    // #region agent log
    log("rotation/route.ts:POST:afterCreate", "Rotation item created", { id: item.id }, "F");
    // #endregion
    return NextResponse.json(item);
  } catch (error) {
    // #region agent log
    log("rotation/route.ts:POST:catch", "API POST rotation error", { error: String(error) }, "A,F");
    // #endregion
    console.error("Dinner rotation API error:", error);
    return NextResponse.json(
      { error: "Failed to add to rotation" },
      { status: 500 }
    );
  }
}
