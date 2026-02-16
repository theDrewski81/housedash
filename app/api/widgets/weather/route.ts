import { NextResponse } from "next/server";
import { getWeatherData } from "@/lib/api/weather";
import { getAppConfig } from "@/lib/app-config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let lat = searchParams.get("lat")
      ? parseFloat(searchParams.get("lat")!)
      : undefined;
    let lon = searchParams.get("lon")
      ? parseFloat(searchParams.get("lon")!)
      : undefined;

    if (lat === undefined || lon === undefined) {
      const config = await getAppConfig();
      if (
        config.weatherLat != null &&
        config.weatherLon != null
      ) {
        lat = config.weatherLat;
        lon = config.weatherLon;
      }
    }

    const weather = await getWeatherData(lat, lon);
    return NextResponse.json(weather);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
