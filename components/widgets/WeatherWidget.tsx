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
  const hourlySlice = weather?.hourly?.slice(0, 6) ?? [];

  const currentContent = weather ? (
    <div className="space-y-2">
      {/* Current weather — when expanded: current | hourly | high/low */}
      <div className="flex items-center justify-between gap-4">
        <div
          className={
            isExpanded
              ? "flex items-center gap-5 flex-shrink-0"
              : "flex items-center gap-4"
          }
        >
          <img
            src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
            alt={weather.current.description}
            className={isExpanded ? "w-20 h-20" : "w-16 h-16"}
          />
          <div>
            <div
              className={
                isExpanded ? "text-4xl font-bold" : "text-3xl font-bold"
              }
            >
              {weather.current.temp}°F
            </div>
            <div
              className={
                isExpanded ? "text-base text-gray-400 capitalize" : "text-sm text-gray-400 capitalize"
              }
            >
              {weather.current.description}
            </div>
          </div>
        </div>
        {isExpanded && hourlySlice.length > 0 && (
          <div
            className="flex items-stretch justify-end gap-1 rounded-lg bg-gray-700/60 py-2 px-2 min-h-[4.5rem] flex-1 min-w-0 mx-1"
          >
            {hourlySlice.map((h) => (
              <div
                key={h.dt}
                className="flex flex-col items-center justify-center flex-shrink-0"
              >
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(h.dt * 1000).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    hour12: true,
                  })}
                </span>
                <img
                  src={`https://openweathermap.org/img/wn/${h.icon}.png`}
                  alt={h.description}
                  className="w-7 h-7 flex-shrink-0"
                />
                <span className="text-xs font-medium">{h.temp}°</span>
              </div>
            ))}
          </div>
        )}
        {todayForecast != null && (
          <div className="flex flex-col items-end text-right flex-shrink-0">
            <div className="text-sm text-gray-400">High</div>
            <div className={isExpanded ? "text-2xl font-semibold" : "text-xl font-semibold"}>
              {todayForecast.temp.max}°F
            </div>
            <div className="text-sm text-gray-400 mt-1">Low</div>
            <div className={isExpanded ? "text-2xl font-semibold" : "text-xl font-semibold"}>
              {todayForecast.temp.min}°F
            </div>
          </div>
        )}
      </div>

      {/* Minor details: single row when expanded (more spacing), 2x2 when collapsed */}
      <div
        className={
          isExpanded
            ? "flex flex-wrap items-center gap-x-8 gap-y-1 text-sm"
            : "grid grid-cols-2 gap-2 text-sm"
        }
      >
        <div>
          <span className="text-gray-400">Feels like:</span>{" "}
          {weather.current.feelsLike}°F
        </div>
        <div>
          <span className="text-gray-400">Wind:</span>{" "}
          {weather.current.windSpeed} mph
        </div>
        <div>
          <span className="text-gray-400">Humidity:</span>{" "}
          {weather.current.humidity}%
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
    <div className="flex justify-center w-full">
      <div className="inline-grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {weather.forecast.map((day, index) => (
        <div
          key={day.date}
          className="flex flex-col items-center gap-0.5 p-1.5 bg-gray-700/80 rounded-lg min-w-0"
        >
          <div className="text-[11px] font-medium text-gray-300 truncate w-full text-center leading-tight">
            {index === 0
              ? "Today"
              : new Date(day.date).toLocaleDateString("en-US", {
                  weekday: "short",
                })}
          </div>
          <img
            src={`https://openweathermap.org/img/wn/${day.icon}.png`}
            alt={day.description}
            className="w-7 h-7 flex-shrink-0"
            title={day.description}
          />
          <div className="text-xs font-semibold whitespace-nowrap">
            {day.temp.min}° / {day.temp.max}°
          </div>
        </div>
      ))}
      </div>
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
