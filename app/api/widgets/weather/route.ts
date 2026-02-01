import { NextResponse } from "next/server";
import { getWeatherData } from "@/lib/api/weather";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat")
      ? parseFloat(searchParams.get("lat")!)
      : undefined;
    const lon = searchParams.get("lon")
      ? parseFloat(searchParams.get("lon")!)
      : undefined;

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
