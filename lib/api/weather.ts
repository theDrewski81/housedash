export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    description: string;
    icon: string;
    windSpeed: number;
    visibility: number;
    sunrise: number;
    sunset: number;
    timezone: number;
  };
  /** Next 3-hour slots (typically 4 items = 12h) for hourly strip. */
  hourly: Array<{
    dt: number;
    temp: number;
    icon: string;
    description: string;
  }>;
  forecast: Array<{
    date: string;
    temp: {
      min: number;
      max: number;
    };
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  }>;
}

export async function getWeatherData(
  lat: number = 40.7128,
  lon: number = -74.0060
): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not set");
  }

  // Get current weather
  const currentResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
  );

  if (!currentResponse.ok) {
    throw new Error("Failed to fetch current weather");
  }

  const currentData = await currentResponse.json();

  // Get 7-day forecast
  const forecastResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
  );

  if (!forecastResponse.ok) {
    throw new Error("Failed to fetch forecast");
  }

  const forecastData = await forecastResponse.json();

  // Process current weather (sys.sunrise/sunset are Unix seconds UTC; timezone is offset in seconds)
  const current = {
    temp: Math.round(currentData.main.temp),
    feelsLike: Math.round(currentData.main.feels_like),
    humidity: currentData.main.humidity,
    pressure: currentData.main.pressure,
    description: currentData.weather[0].description,
    icon: currentData.weather[0].icon,
    windSpeed: Math.round(currentData.wind.speed),
    visibility: currentData.visibility ? currentData.visibility / 1000 : 0,
    sunrise: currentData.sys?.sunrise ?? 0,
    sunset: currentData.sys?.sunset ?? 0,
    timezone: currentData.timezone ?? 0,
  };

  // Process forecast - group by local day using location timezone (avoid UTC date boundary issues)
  const timezone = forecastData.city?.timezone ?? currentData.timezone ?? 0;
  const dailyForecast: { [key: string]: any } = {};
  forecastData.list.forEach((item: any) => {
    const localDayIndex = Math.floor((item.dt + timezone) / 86400);
    const dateKey = new Date((localDayIndex * 86400 - timezone) * 1000)
      .toISOString()
      .split("T")[0];

    if (!dailyForecast[dateKey]) {
      dailyForecast[dateKey] = {
        date: dateKey,
        temps: [],
        descriptions: [],
        icons: [],
        humidity: [],
        windSpeed: [],
      };
    }

    dailyForecast[dateKey].temps.push(item.main.temp);
    dailyForecast[dateKey].descriptions.push(item.weather[0].description);
    dailyForecast[dateKey].icons.push(item.weather[0].icon);
    dailyForecast[dateKey].humidity.push(item.main.humidity);
    dailyForecast[dateKey].windSpeed.push(item.wind.speed);
  });

  const forecast = Object.values(dailyForecast)
    .slice(0, 6)
    .map((day: any) => ({
      date: day.date,
      temp: {
        min: Math.round(Math.min(...day.temps)),
        max: Math.round(Math.max(...day.temps)),
      },
      description: day.descriptions[Math.floor(day.descriptions.length / 2)],
      icon: day.icons[Math.floor(day.icons.length / 2)],
      humidity: Math.round(
        day.humidity.reduce((a: number, b: number) => a + b, 0) /
          day.humidity.length
      ),
      windSpeed: Math.round(
        day.windSpeed.reduce((a: number, b: number) => a + b, 0) /
          day.windSpeed.length
      ),
    }));

  const now = Math.floor(Date.now() / 1000);
  const futureList = forecastData.list.filter(
    (item: { dt: number }) => item.dt >= now
  );
  const hourlySource = futureList.length > 0 ? futureList : forecastData.list;
  const hourly = hourlySource.slice(0, 8).map((item: any) => ({
    dt: item.dt,
    temp: Math.round(item.main.temp),
    icon: item.weather[0].icon,
    description: item.weather[0].description,
  }));

  return { current, hourly, forecast };
}
