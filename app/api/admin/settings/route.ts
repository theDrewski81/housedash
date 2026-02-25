import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getAppConfig, type CalendarConfig } from "@/lib/app-config";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/app-config";
import type { Prisma } from "@prisma/client";
import { geocodeLocation } from "@/lib/api/geocode";

const APP_CONFIG_ID = "default";
const WEATHER_LOCATION_MAX_LENGTH = 200;
const CALENDAR_ID_MAX_LENGTH = 256;

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
    const weatherLocation =
      body.weatherLocation !== undefined
        ? (body.weatherLocation as string).trim()
        : undefined;
    const calendarConfigsRaw = body.calendarConfigs as unknown;

    let weatherLocationName: string | null | undefined;
    let weatherLat: number | null | undefined;
    let weatherLon: number | null | undefined;

    if (weatherLocation !== undefined) {
      if (weatherLocation.length > WEATHER_LOCATION_MAX_LENGTH) {
        return NextResponse.json(
          { error: "Location string is too long" },
          { status: 400 }
        );
      }
      if (weatherLocation === "") {
        weatherLocationName = null;
        weatherLat = null;
        weatherLon = null;
      } else {
        const geocoded = await geocodeLocation(weatherLocation);
        if (!geocoded) {
          return NextResponse.json(
            {
              error:
                "Location not found. Try 'City, State' or a ZIP code.",
            },
            { status: 400 }
          );
        }
        weatherLocationName = geocoded.name;
        weatherLat = geocoded.lat;
        weatherLon = geocoded.lon;
      }
    }

    let calendarConfigs: CalendarConfig[] | null | undefined;
    if (calendarConfigsRaw !== undefined) {
      if (!Array.isArray(calendarConfigsRaw)) {
        return NextResponse.json(
          { error: "calendarConfigs must be an array" },
          { status: 400 }
        );
      }
      const parsed: CalendarConfig[] = [];
      for (const item of calendarConfigsRaw) {
        if (item == null || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string") {
          continue;
        }
        const id = ((item as { id: string }).id || "").trim();
        if (id.length === 0 || id.length > CALENDAR_ID_MAX_LENGTH) continue;
        const color = typeof (item as { color?: unknown }).color === "string"
          ? (item as { color: string }).color.trim()
          : undefined;
        parsed.push({ id, color: color || undefined });
      }
      calendarConfigs = parsed.length > 0 ? parsed : null;
    }

    const updated = await prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      create: {
        id: APP_CONFIG_ID,
        allowAccountCreation: allowAccountCreation ?? false,
        auditUserCrud: auditUserCrud ?? false,
        ...(weatherLocationName !== undefined && {
          weatherLocationName: weatherLocationName ?? null,
        }),
        ...(weatherLat !== undefined && { weatherLat: weatherLat ?? null }),
        ...(weatherLon !== undefined && { weatherLon: weatherLon ?? null }),
        ...(calendarConfigs !== undefined && {
          calendarConfigs: calendarConfigs as Prisma.InputJsonValue,
        }),
      },
      update: {
        ...(allowAccountCreation !== undefined && {
          allowAccountCreation,
        }),
        ...(auditUserCrud !== undefined && { auditUserCrud }),
        ...(weatherLocationName !== undefined && {
          weatherLocationName,
        }),
        ...(weatherLat !== undefined && { weatherLat: weatherLat ?? null }),
        ...(weatherLon !== undefined && { weatherLon: weatherLon ?? null }),
        ...(calendarConfigs !== undefined && {
          calendarConfigs: calendarConfigs as Prisma.InputJsonValue,
        }),
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

    const rawUpdated = updated as { calendarConfigs?: unknown };
    const parsedCalendars = Array.isArray(rawUpdated.calendarConfigs)
      ? (rawUpdated.calendarConfigs as CalendarConfig[])
      : null;

    return NextResponse.json({
      allowAccountCreation: updated.allowAccountCreation,
      auditUserCrud: updated.auditUserCrud,
      weatherLat: updated.weatherLat ?? null,
      weatherLon: updated.weatherLon ?? null,
      weatherLocationName: updated.weatherLocationName ?? null,
      calendarConfigs: parsedCalendars,
    });
  } catch (error) {
    console.error("Admin settings PATCH error:", error);
    const message =
      error instanceof Error ? error.message : String(error);
    const isSchemaError =
      message.includes("weather_lat") ||
      message.includes("weather_lon") ||
      message.includes("weather_location_name") ||
      message.includes("calendar_configs") ||
      message.includes("does not exist") ||
      message.includes("column");
    if (isSchemaError) {
      return NextResponse.json(
        {
          error:
            "Database schema is out of date. Run migrations to save weather location (see README Docker section).",
          details: message,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to update settings",
        details: message,
      },
      { status: 500 }
    );
  }
}
