"use client";

import {
  WiDaySunny,
  WiNightClear,
  WiDayCloudy,
  WiNightAltPartlyCloudy,
  WiCloud,
  WiCloudy,
  WiDayShowers,
  WiNightAltShowers,
  WiDayRain,
  WiNightAltRain,
  WiDayThunderstorm,
  WiNightAltThunderstorm,
  WiDaySnow,
  WiNightAltSnow,
  WiDayFog,
  WiNightFog,
  WiCloudyGusts,
} from "react-icons/wi";
import type { IconType } from "react-icons";

const ICON_MAP: Record<string, IconType> = {
  "01d": WiDaySunny,
  "01n": WiNightClear,
  "02d": WiDayCloudy,
  "02n": WiNightAltPartlyCloudy,
  "03d": WiCloud,
  "03n": WiCloud,
  "04d": WiCloudy,
  "04n": WiCloudy,
  "09d": WiDayShowers,
  "09n": WiNightAltShowers,
  "10d": WiDayRain,
  "10n": WiNightAltRain,
  "11d": WiDayThunderstorm,
  "11n": WiNightAltThunderstorm,
  "13d": WiDaySnow,
  "13n": WiNightAltSnow,
  "50d": WiDayFog,
  "50n": WiNightFog,
};

interface WeatherIconProps {
  icon: string;
  size?: number;
  className?: string;
  title?: string;
}

export default function WeatherIcon({ icon, size = 40, className = "", title }: WeatherIconProps) {
  const IconComponent = ICON_MAP[icon] ?? WiCloudyGusts;
  return (
    <IconComponent
      size={size}
      className={className}
      title={title}
      aria-hidden={!title}
    />
  );
}
