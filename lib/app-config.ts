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

export type CalendarConfig = { id: string; color?: string };

export type AppConfigRow = {
  id: string;
  allowAccountCreation: boolean;
  auditUserCrud: boolean;
  weatherLat: number | null;
  weatherLon: number | null;
  weatherLocationName: string | null;
  calendarConfigs: CalendarConfig[] | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_APP_CONFIG = {
  allowAccountCreation: false,
  auditUserCrud: false,
  weatherLat: null as number | null,
  weatherLon: null as number | null,
  weatherLocationName: null as string | null,
  calendarConfigs: null as CalendarConfig[] | null,
};

function isSchemaError(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message : String(error);
  return (
    msg.includes("weather_lat") ||
    msg.includes("weather_lon") ||
    msg.includes("weather_location_name") ||
    msg.includes("calendar_configs") ||
    msg.includes("does not exist") ||
    msg.includes("column")
  );
}

function parseCalendarConfigs(val: unknown): CalendarConfig[] | null {
  if (!Array.isArray(val)) return null;
  return val
    .filter((item): item is { id: string; color?: string } =>
      item != null && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"
    )
    .map((item) => ({
      id: (item as { id: string }).id.trim(),
      color: typeof (item as { color?: unknown }).color === "string" ? (item as { color: string }).color : undefined,
    }))
    .filter((item) => item.id.length > 0);
}

export async function getAppConfig(): Promise<{
  allowAccountCreation: boolean;
  auditUserCrud: boolean;
  weatherLat: number | null;
  weatherLon: number | null;
  weatherLocationName: string | null;
  calendarConfigs: CalendarConfig[] | null;
}> {
  try {
    let row = await prisma.appConfig.findUnique({
      where: { id: APP_CONFIG_ID },
    });
    if (!row) {
      const ensured = await ensureAppConfig();
      return {
        allowAccountCreation: ensured.allowAccountCreation,
        auditUserCrud: ensured.auditUserCrud,
        weatherLat: ensured.weatherLat ?? null,
        weatherLon: ensured.weatherLon ?? null,
        weatherLocationName: ensured.weatherLocationName ?? null,
        calendarConfigs: ensured.calendarConfigs ?? null,
      };
    }
    const raw = row as { calendarConfigs?: unknown };
    return {
      allowAccountCreation: row.allowAccountCreation,
      auditUserCrud: row.auditUserCrud,
      weatherLat: row.weatherLat ?? null,
      weatherLon: row.weatherLon ?? null,
      weatherLocationName: row.weatherLocationName ?? null,
      calendarConfigs: parseCalendarConfigs(raw.calendarConfigs) ?? null,
    };
  } catch (error) {
    if (isSchemaError(error)) {
      console.error("getAppConfig: schema error (migrations may be missing):", error);
      return { ...DEFAULT_APP_CONFIG };
    }
    throw error;
  }
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
  const raw = row as { calendarConfigs?: unknown };
  return {
    ...row,
    weatherLat: row.weatherLat ?? null,
    weatherLon: row.weatherLon ?? null,
    weatherLocationName: row.weatherLocationName ?? null,
    calendarConfigs: parseCalendarConfigs(raw.calendarConfigs) ?? null,
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
