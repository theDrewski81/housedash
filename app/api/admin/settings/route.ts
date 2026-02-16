import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getAppConfig } from "@/lib/app-config";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/app-config";
import { geocodeLocation } from "@/lib/api/geocode";

const APP_CONFIG_ID = "default";
const WEATHER_LOCATION_MAX_LENGTH = 200;

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
      weatherLat: updated.weatherLat ?? null,
      weatherLon: updated.weatherLon ?? null,
      weatherLocationName: updated.weatherLocationName ?? null,
    });
  } catch (error) {
    console.error("Admin settings PATCH error:", error);
    const message =
      error instanceof Error ? error.message : String(error);
    const isSchemaError =
      message.includes("weather_lat") ||
      message.includes("weather_lon") ||
      message.includes("weather_location_name") ||
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
