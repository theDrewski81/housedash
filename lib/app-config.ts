import { prisma } from "./db/prisma";
import type { Prisma } from "@prisma/client";

const APP_CONFIG_ID = "default";

export type AuditAction =
  | "allow_account_creation_toggle"
  | "audit_user_crud_toggle"
  | "user_approve"
  | "user_reject"
  | "user_update"
  | "user_created"
  | "user_delete"
  | "user_sign_out";

export type AppConfigRow = {
  id: string;
  allowAccountCreation: boolean;
  auditUserCrud: boolean;
  weatherLat: number | null;
  weatherLon: number | null;
  weatherLocationName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getAppConfig(): Promise<{
  allowAccountCreation: boolean;
  auditUserCrud: boolean;
  weatherLat: number | null;
  weatherLon: number | null;
  weatherLocationName: string | null;
}> {
  const row = await prisma.appConfig.findUnique({
    where: { id: APP_CONFIG_ID },
  });
  if (!row) {
    return {
      allowAccountCreation: false,
      auditUserCrud: false,
      weatherLat: null,
      weatherLon: null,
      weatherLocationName: null,
    };
  }
  return {
    allowAccountCreation: row.allowAccountCreation,
    auditUserCrud: row.auditUserCrud,
    weatherLat: row.weatherLat ?? null,
    weatherLon: row.weatherLon ?? null,
    weatherLocationName: row.weatherLocationName ?? null,
  };
}

export async function ensureAppConfig(): Promise<AppConfigRow> {
  const row = await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: {
      id: APP_CONFIG_ID,
      allowAccountCreation: false,
      auditUserCrud: false,
    },
    update: {},
  });
  return {
    ...row,
    weatherLat: row.weatherLat ?? null,
    weatherLon: row.weatherLon ?? null,
    weatherLocationName: row.weatherLocationName ?? null,
  };
}

export async function setAllowAccountCreation(value: boolean): Promise<void> {
  await prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: {
      id: APP_CONFIG_ID,
      allowAccountCreation: value,
      auditUserCrud: false,
    },
    update: { allowAccountCreation: value },
  });
}

export async function shouldAuditUserCrud(): Promise<boolean> {
  const config = await getAppConfig();
  return config.auditUserCrud;
}

export async function writeAuditLog(params: {
  adminUserId: string;
  action: AuditAction;
  targetUserId?: string | null;
  details?: Prisma.InputJsonValue | null;
}): Promise<void> {
  const auditing = await shouldAuditUserCrud();
  if (!auditing) return;
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: params.adminUserId,
      action: params.action,
      targetUserId: params.targetUserId ?? undefined,
      details: params.details ?? undefined,
    },
  });
}
