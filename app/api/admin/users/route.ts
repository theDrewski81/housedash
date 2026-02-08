import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/app-config";
import type { UserRole, UserStatus } from "@prisma/client";

function handleAuthError(e: unknown): NextResponse {
  const err = e as Error & { status?: number };
  return NextResponse.json(
    { error: err.message },
    { status: err.status ?? 401 }
  );
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return handleAuthError(e);
  }
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        status: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const pendingCount = users.filter((u) => u.status === "pending_approval").length;
    return NextResponse.json({ users, pendingCount });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}

type UserUpdateItem = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  status?: UserStatus;
  role?: UserRole;
};

type ApprovalItem = {
  userId: string;
  action: "approve" | "reject";
  role?: UserRole;
};

type PatchBody = {
  allowAccountCreation?: boolean;
  auditUserCrud?: boolean;
  users?: UserUpdateItem[];
  approvalQueue?: ApprovalItem[];
};

export async function PATCH(request: NextRequest) {
  let adminUser: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    adminUser = await requireAdmin();
  } catch (e) {
    return handleAuthError(e);
  }
  try {
    const body = (await request.json()) as PatchBody;
    const rejectedEmails: { userId: string; email?: string }[] = [];

    await prisma.$transaction(async (tx) => {
      if (body.allowAccountCreation !== undefined || body.auditUserCrud !== undefined) {
        await tx.appConfig.upsert({
          where: { id: "default" },
          create: {
            id: "default",
            allowAccountCreation: body.allowAccountCreation ?? false,
            auditUserCrud: body.auditUserCrud ?? false,
          },
          update: {
            ...(body.allowAccountCreation !== undefined && {
              allowAccountCreation: body.allowAccountCreation,
            }),
            ...(body.auditUserCrud !== undefined && {
              auditUserCrud: body.auditUserCrud,
            }),
          },
        });
      }

      if (body.users?.length) {
        for (const u of body.users) {
          await tx.user.update({
            where: { id: u.id },
            data: {
              ...(u.firstName !== undefined && { firstName: u.firstName }),
              ...(u.lastName !== undefined && { lastName: u.lastName }),
              ...(u.status !== undefined && { status: u.status }),
              ...(u.role !== undefined && { role: u.role }),
            },
          });
        }
      }

      if (body.approvalQueue?.length) {
        for (const item of body.approvalQueue) {
          if (item.action === "reject") {
            const target = await tx.user.findUnique({
              where: { id: item.userId },
              select: { email: true },
            });
            rejectedEmails.push({
              userId: item.userId,
              email: target?.email ?? undefined,
            });
            await tx.user.delete({ where: { id: item.userId } });
          } else {
            await tx.user.update({
              where: { id: item.userId },
              data: {
                status: "active",
                ...(item.role && { role: item.role }),
              },
            });
          }
        }
      }
    });

    for (const r of rejectedEmails) {
      await writeAuditLog({
        adminUserId: adminUser.id,
        action: "user_reject",
        targetUserId: r.userId,
        details: r.email ? { email: r.email } : undefined,
      });
    }
    for (const item of body.approvalQueue ?? []) {
      if (item.action === "approve") {
        await writeAuditLog({
          adminUserId: adminUser.id,
          action: "user_approve",
          targetUserId: item.userId,
          details: item.role ? { role: item.role } : undefined,
        });
      }
    }
    for (const u of body.users ?? []) {
      await writeAuditLog({
        adminUserId: adminUser.id,
        action: "user_update",
        targetUserId: u.id,
        details: {
          ...(u.firstName !== undefined && { firstName: u.firstName }),
          ...(u.lastName !== undefined && { lastName: u.lastName }),
          ...(u.status !== undefined && { status: u.status }),
          ...(u.role !== undefined && { role: u.role }),
        },
      });
    }
    if (body.allowAccountCreation !== undefined) {
      await writeAuditLog({
        adminUserId: adminUser.id,
        action: "allow_account_creation_toggle",
        details: { allowAccountCreation: body.allowAccountCreation },
      });
    }
    if (body.auditUserCrud !== undefined) {
      await writeAuditLog({
        adminUserId: adminUser.id,
        action: "audit_user_crud_toggle",
        details: { auditUserCrud: body.auditUserCrud },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update users" },
      { status: 500 }
    );
  }
}
