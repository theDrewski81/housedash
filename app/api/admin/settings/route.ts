import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getAppConfig } from "@/lib/app-config";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/app-config";

const APP_CONFIG_ID = "default";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 401 }
    );
  }
  try {
    const config = await getAppConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Admin settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let adminUser: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    adminUser = await requireAdmin();
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message },
      { status: err.status ?? 401 }
    );
  }
  try {
    const body = await request.json();
    const allowAccountCreation =
      body.allowAccountCreation as boolean | undefined;
    const auditUserCrud = body.auditUserCrud as boolean | undefined;

    const updated = await prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      create: {
        id: APP_CONFIG_ID,
        allowAccountCreation: allowAccountCreation ?? false,
        auditUserCrud: auditUserCrud ?? false,
      },
      update: {
        ...(allowAccountCreation !== undefined && {
          allowAccountCreation,
        }),
        ...(auditUserCrud !== undefined && { auditUserCrud }),
      },
    });

    if (allowAccountCreation !== undefined) {
      await writeAuditLog({
        adminUserId: adminUser.id,
        action: "allow_account_creation_toggle",
        details: { allowAccountCreation: updated.allowAccountCreation },
      });
    }
    if (auditUserCrud !== undefined) {
      await writeAuditLog({
        adminUserId: adminUser.id,
        action: "audit_user_crud_toggle",
        details: { auditUserCrud: updated.auditUserCrud },
      });
    }

    return NextResponse.json({
      allowAccountCreation: updated.allowAccountCreation,
      auditUserCrud: updated.auditUserCrud,
    });
  } catch (error) {
    console.error("Admin settings PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
