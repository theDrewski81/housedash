import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db/prisma";

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
    await prisma.$queryRaw`SELECT "weather_lat", "calendar_configs" FROM app_config LIMIT 1`;
    return NextResponse.json({
      weatherLocationSupported: true,
      calendarConfigsSupported: true,
    });
  } catch {
    try {
      await prisma.$queryRaw`SELECT "weather_lat" FROM app_config LIMIT 1`;
      return NextResponse.json({
        weatherLocationSupported: true,
        calendarConfigsSupported: false,
      });
    } catch {
      return NextResponse.json({
        weatherLocationSupported: false,
        calendarConfigsSupported: false,
      });
    }
  }
}
