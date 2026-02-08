import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

function handleAuthError(e: unknown): NextResponse {
  const err = e as Error & { status?: number };
  return NextResponse.json(
    { error: err.message },
    { status: err.status ?? 401 }
  );
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return handleAuthError(e);
  }
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10))
    );
    const skip = (page - 1) * pageSize;

    const [entries, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          adminUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.adminAuditLog.count(),
    ]);

    const items = entries.map((e) => ({
      id: e.id,
      action: e.action,
      targetUserId: e.targetUserId,
      details: e.details,
      createdAt: e.createdAt.toISOString(),
      adminUser: e.adminUser
        ? {
            id: e.adminUser.id,
            email: e.adminUser.email,
            name: [e.adminUser.firstName, e.adminUser.lastName].filter(Boolean).join(" ") || e.adminUser.email,
          }
        : null,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Admin logs GET error:", error);
    return NextResponse.json(
      { error: "Failed to load logs" },
      { status: 500 }
    );
  }
}
