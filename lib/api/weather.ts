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
  };
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

  // Process current weather
  const current = {
    temp: Math.round(currentData.main.temp),
    feelsLike: Math.round(currentData.main.feels_like),
    humidity: currentData.main.humidity,
    pressure: currentData.main.pressure,
    description: currentData.weather[0].description,
    icon: currentData.weather[0].icon,
    windSpeed: Math.round(currentData.wind.speed),
    visibility: currentData.visibility ? currentData.visibility / 1000 : 0,
  };

  // Process forecast - group by day and get daily min/max
  const dailyForecast: { [key: string]: any } = {};
  forecastData.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toISOString().split("T")[0];

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
    .slice(0, 7)
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

  return { current, forecast };
}
