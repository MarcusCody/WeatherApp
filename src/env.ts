export function getOpenWeatherApiKey(): string {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing OPENWEATHER_API_KEY. Create a .env file with OPENWEATHER_API_KEY=... (see config/env.example)."
    );
  }
  return key;
}

