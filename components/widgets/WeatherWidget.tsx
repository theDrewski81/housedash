"use client";

import { useEffect, useState } from "react";
import Widget from "@/components/ui/Widget";
import { WeatherData } from "@/lib/api/weather";

interface WeatherWidgetProps {
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export default function WeatherWidget({ isExpanded, onExpandToggle }: WeatherWidgetProps = {}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/widgets/weather");
      if (!response.ok) throw new Error("Failed to fetch weather");
      const data = await response.json();
      setWeather(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setLoading(false);
    }
  };

  const nextSunriseSunset =
    weather?.current != null &&
    typeof weather.current.sunrise === "number" &&
    typeof weather.current.sunset === "number"
      ? (() => {
          const now = Math.floor(Date.now() / 1000);
          const tz = weather.current.timezone ?? 0;
          const nowLocal = now + tz;
          const sunriseLocal = weather.current.sunrise + tz;
          const sunsetLocal = weather.current.sunset + tz;
          const daySeconds = 86400;
          let label: string;
          let timeUnix: number;
          if (nowLocal < sunriseLocal) {
            label = "Sunrise";
            timeUnix = weather.current.sunrise;
          } else if (nowLocal < sunsetLocal) {
            label = "Sunset";
            timeUnix = weather.current.sunset;
          } else {
            label = "Sunrise";
            timeUnix = weather.current.sunrise + daySeconds;
          }
          const timeStr = new Date((timeUnix + tz) * 1000).toLocaleTimeString(
            "en-US",
            { timeZone: "UTC", hour: "numeric", minute: "2-digit" }
          );
          return `${label} ${timeStr}`;
        })()
      : null;

  const todayForecast = weather?.forecast?.[0];
  const currentContent = weather ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
            alt={weather.current.description}
            className="w-16 h-16"
          />
          <div>
            <div className="text-3xl font-bold">{weather.current.temp}°F</div>
            <div className="text-sm text-gray-400 capitalize">
              {weather.current.description}
            </div>
          </div>
        </div>
        {todayForecast != null && (
          <div className="flex flex-col items-end text-right">
            <div className="text-sm text-gray-400">High</div>
            <div className="text-xl font-semibold">
              {todayForecast.temp.max}°F
            </div>
            <div className="text-sm text-gray-400 mt-1">Low</div>
            <div className="text-xl font-semibold">
              {todayForecast.temp.min}°F
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-400">Feels like:</span>{" "}
          {weather.current.feelsLike}°F
        </div>
        <div>
          <span className="text-gray-400">Humidity:</span>{" "}
          {weather.current.humidity}%
        </div>
        <div>
          <span className="text-gray-400">Wind:</span>{" "}
          {weather.current.windSpeed} mph
        </div>
        <div>
          {nextSunriseSunset != null ? (
            <span className="text-gray-400">{nextSunriseSunset}</span>
          ) : (
            <>
              <span className="text-gray-400">Pressure:</span>{" "}
              {weather.current.pressure} hPa
            </>
          )}
        </div>
      </div>
    </div>
  ) : loading ? (
    <div className="text-gray-400">Loading weather...</div>
  ) : (
    <div className="text-red-400">Error: {error}</div>
  );

  const forecastContent = weather ? (
    <div className="space-y-3">
      {weather.forecast.map((day, index) => (
        <div
          key={day.date}
          className="flex items-center justify-between p-2 bg-gray-700 rounded"
        >
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">
              {index === 0
                ? "Today"
                : new Date(day.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
            </div>
            <img
              src={`https://openweathermap.org/img/wn/${day.icon}.png`}
              alt={day.description}
              className="w-10 h-10"
            />
            <div className="text-sm capitalize text-gray-300">
              {day.description}
            </div>
          </div>
          <div className="text-sm font-semibold">
            {day.temp.min}° / {day.temp.max}°F
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <Widget
      title="Weather"
      expandedContent={forecastContent}
      className="lg:col-span-1"
      isExpanded={isExpanded}
      onExpandToggle={onExpandToggle}
    >
      {currentContent}
    </Widget>
  );
}
