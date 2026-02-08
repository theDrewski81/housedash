import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/app-config";

function handleAuthError(e: unknown): NextResponse {
  const err = e as Error & { status?: number };
  return NextResponse.json(
    { error: err.message },
    { status: err.status ?? 401 }
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    const { id: userId } = await params;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.session.deleteMany({ where: { userId } });

    await writeAuditLog({
      adminUserId: adminUser.id,
      action: "user_sign_out",
      targetUserId: userId,
      details: { email: target.email },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleAuthError(e);
  }
}
