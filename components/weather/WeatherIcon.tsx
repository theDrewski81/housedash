"use client";

/** OpenWeather icon code -> Visual Crossing icon name (1st Set) */
const OPENWEATHER_TO_VISUALCROSSING: Record<string, string> = {
  "01d": "clear-day",
  "01n": "clear-night",
  "02d": "partly-cloudy-day",
  "02n": "partly-cloudy-night",
  "03d": "partly-cloudy-day",
  "03n": "partly-cloudy-night",
  "04d": "cloudy",
  "04n": "cloudy",
  "09d": "rain",
  "09n": "rain",
  "10d": "rain",
  "10n": "rain",
  "11d": "rain",
  "11n": "rain",
  "13d": "snow",
  "13n": "snow",
  "50d": "fog",
  "50n": "fog",
};

const METEOCONS_CDN =
  "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@2.0.0/production/fill/openweathermap";
const VISUALCROSSING_CDN =
  "https://cdn.jsdelivr.net/gh/visualcrossing/WeatherIcons@main/SVG/1st%20Set%20-%20Color";
const OPENWEATHER_CDN = "https://openweathermap.org/img/wn";

export type WeatherIconSet = "openweather" | "meteocons" | "visualcrossing";

function getIconSrc(icon: string, iconSet: WeatherIconSet): string {
  const code = icon in OPENWEATHER_TO_VISUALCROSSING ? icon : "01d";
  switch (iconSet) {
    case "meteocons":
      return `${METEOCONS_CDN}/${code}.svg`;
    case "visualcrossing": {
      const vcName = OPENWEATHER_TO_VISUALCROSSING[code] ?? "clear-day";
      return `${VISUALCROSSING_CDN}/${vcName}.svg`;
    }
    default:
      return `${OPENWEATHER_CDN}/${icon}@2x.png`;
  }
}

interface WeatherIconProps {
  icon: string;
  iconSet?: WeatherIconSet | null;
  size?: number;
  className?: string;
  alt?: string;
  title?: string;
}

export default function WeatherIcon({
  icon,
  iconSet = "openweather",
  size = 40,
  className = "",
  alt = "Weather",
  title,
}: WeatherIconProps) {
  const src = getIconSrc(icon, iconSet ?? "openweather");
  const isSvg = iconSet !== "openweather";
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      style={isSvg ? { width: size, height: size, minWidth: size, minHeight: size } : undefined}
    />
  );
}
