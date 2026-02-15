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

const USER_ROLES: UserRole[] = ["admin", "super_user", "user", "read_only"];
const NEW_USER_STATUSES: ("active" | "inactive")[] = ["active", "inactive"];

type PostBody = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: "active" | "inactive";
};

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

export async function POST(request: NextRequest) {
  let adminUser: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    adminUser = await requireAdmin();
  } catch (e) {
    return handleAuthError(e);
  }
  try {
    const body = (await request.json()) as PostBody;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const role = body.role;
    const status = body.status;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required." },
        { status: 400 }
      );
    }
    if (!USER_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role." },
        { status: 400 }
      );
    }
    if (!NEW_USER_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Status must be active or inactive." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        name,
        role,
        status,
      },
    });

    await writeAuditLog({
      adminUserId: adminUser.id,
      action: "user_created",
      targetUserId: user.id,
      details: { email: user.email, role, status },
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
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
    const results: {
      approved: { email: string }[];
      rejected: { email: string }[];
      updated: { email: string; roleChanged?: boolean; newRole?: UserRole }[];
    } = { approved: [], rejected: [], updated: [] };

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
          const current = await tx.user.findUnique({
            where: { id: u.id },
            select: { email: true, role: true },
          });
          if (current) {
            const roleChanged =
              u.role !== undefined && current.role !== u.role;
            await tx.user.update({
              where: { id: u.id },
              data: {
                ...(u.firstName !== undefined && { firstName: u.firstName }),
                ...(u.lastName !== undefined && { lastName: u.lastName }),
                ...(u.status !== undefined && { status: u.status }),
                ...(u.role !== undefined && { role: u.role }),
              },
            });
            results.updated.push({
              email: current.email,
              roleChanged: roleChanged || undefined,
              newRole: u.role,
            });
          }
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
            if (target?.email) results.rejected.push({ email: target.email });
            await tx.user.delete({ where: { id: item.userId } });
          } else {
            const target = await tx.user.findUnique({
              where: { id: item.userId },
              select: { email: true },
            });
            if (target?.email) results.approved.push({ email: target.email });
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

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update users" },
      { status: 500 }
    );
  }
}
