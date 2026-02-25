import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });
    return NextResponse.json(prefs ?? { colors: null, background: null, projectsConfig: null });
  } catch (error) {
    console.error("User preferences GET error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const prefs = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        colors: body.colors ?? undefined,
        background: body.background ?? undefined,
        projectsConfig: body.projectsConfig ?? undefined,
      },
      update: {
        ...(body.colors !== undefined && { colors: body.colors }),
        ...(body.background !== undefined && { background: body.background }),
        ...(body.projectsConfig !== undefined && {
          projectsConfig: body.projectsConfig ?? undefined,
        }),
      },
    });
    return NextResponse.json(prefs);
  } catch (error) {
    console.error("User preferences PATCH error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
