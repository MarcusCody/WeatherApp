import { getOpenWeatherApiKey } from "@/env";
import { HttpStatus } from "@/common/enums";

const OPENWEATHER_CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const OPENWEATHER_GEOCODE_DIRECT_URL = "https://api.openweathermap.org/geo/1.0/direct";
const OPENWEATHER_ICON_BASE_URL = "https://openweathermap.org/img/wn";

export type OpenWeatherCurrentResponse = {
  name: string;
  dt: number; // unix seconds
  timezone: number; // shift in seconds
  sys: { country: string };
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{ main: string; description: string; icon: string }>;
  clouds: { all: number };
};

export type OpenWeatherGeocodeDirectItem = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
};

export type LocationSuggestion = OpenWeatherGeocodeDirectItem & {
  id: string;
  label: string;
};

export type WeatherResult = {
  locationName: string;
  countryCode: string;
  updatedAt: Date;
  tempC: number;
  tempMinC: number;
  tempMaxC: number;
  humidityPct: number;
  condition: string;
  description: string;
  cloudPct: number;
  iconId: string;
};

export class OpenWeatherError extends Error {
  public readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenWeatherError";
    this.status = status;
  }
}

function toResult(
  response: OpenWeatherCurrentResponse,
  display?: Partial<Pick<WeatherResult, "locationName" | "countryCode">>
): WeatherResult {
  const weatherItem = response.weather[0];
  const updatedAt = new Date((response.dt + response.timezone) * 1000);

  const base: WeatherResult = {
    locationName: response.name,
    countryCode: response.sys.country,
    updatedAt,
    tempC: response.main.temp,
    tempMinC: response.main.temp_min,
    tempMaxC: response.main.temp_max,
    humidityPct: response.main.humidity,
    condition: weatherItem?.main ?? "Unknown",
    description: weatherItem?.description ?? "Unknown",
    cloudPct: response.clouds?.all ?? 0,
    iconId: weatherItem?.icon ?? "01d"
  };

  return {
    ...base,
    locationName: display?.locationName ?? base.locationName,
    countryCode: display?.countryCode ?? base.countryCode
  };
}

async function fetchGeocodeTopResult(params: {
  query: string;
  signal?: AbortSignal;
}): Promise<OpenWeatherGeocodeDirectItem> {
  const apiKey = getOpenWeatherApiKey();
  const requestUrl = new URL(OPENWEATHER_GEOCODE_DIRECT_URL);
  requestUrl.searchParams.set("q", params.query);
  requestUrl.searchParams.set("limit", "1");
  requestUrl.searchParams.set("appid", apiKey);

  const response = await fetch(requestUrl.toString(), { method: "GET", signal: params.signal });
  if (!response.ok) {
    let message = "Unable to search location. Please try again.";
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody?.message) message = errorBody.message;
    } catch {
      // ignore
    }
    if (response.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard.";
    }
    throw new OpenWeatherError(message, response.status);
  }

  const geocodeResults = (await response.json()) as OpenWeatherGeocodeDirectItem[];
  const topResult = geocodeResults[0];
  if (!topResult)
    throw new OpenWeatherError(
      "Location not found. Try a more specific name.",
      HttpStatus.NotFound
    );
  return topResult;
}

export function formatLocationLabel(location: OpenWeatherGeocodeDirectItem): string {
  // e.g. "Chicago, Illinois, US"
  return [location.name, location.state, location.country].filter(Boolean).join(", ");
}

function getLocationSuggestionId(location: OpenWeatherGeocodeDirectItem): string {
  return [location.name, location.state ?? "", location.country, location.lat, location.lon]
    .join("|")
    .toLowerCase();
}

function dedupeLocationSuggestions(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();
  return items.filter((suggestion) => {
    const key = suggestion.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchLocations(params: {
  query: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<LocationSuggestion[]> {
  const trimmedQuery = params.query.trim();
  if (!trimmedQuery) return [];

  const apiKey = getOpenWeatherApiKey();
  const requestUrl = new URL(OPENWEATHER_GEOCODE_DIRECT_URL);
  requestUrl.searchParams.set("q", trimmedQuery);
  requestUrl.searchParams.set("limit", String(params.limit ?? 5));
  requestUrl.searchParams.set("appid", apiKey);

  const response = await fetch(requestUrl.toString(), { method: "GET", signal: params.signal });
  if (!response.ok) {
    let message = "Unable to search location. Please try again.";
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody?.message) message = errorBody.message;
    } catch {
      // ignore
    }
    if (response.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard.";
    }
    throw new OpenWeatherError(message, response.status);
  }

  const geocodeResults = (await response.json()) as OpenWeatherGeocodeDirectItem[];
  return dedupeLocationSuggestions(
    geocodeResults.map((location) => ({
      ...location,
      id: getLocationSuggestionId(location),
      label: formatLocationLabel(location)
    }))
  );
}

export async function fetchCurrentWeatherByCoords(params: {
  lat: number;
  lon: number;
  signal?: AbortSignal;
  /**
   * Optional override for display purposes.
   * OpenWeather "weather by coords" can return the nearest station name in `res.name`,
   * which may differ from the user-selected location.
   */
  display?: { locationName: string; countryCode: string };
}): Promise<WeatherResult> {
  const apiKey = getOpenWeatherApiKey();
  const requestUrl = new URL(OPENWEATHER_CURRENT_WEATHER_URL);
  requestUrl.searchParams.set("lat", String(params.lat));
  requestUrl.searchParams.set("lon", String(params.lon));
  requestUrl.searchParams.set("appid", apiKey);
  requestUrl.searchParams.set("units", "metric");

  const response = await fetch(requestUrl.toString(), { method: "GET", signal: params.signal });
  if (!response.ok) {
    let message = "Unable to fetch weather. Please try again.";
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody?.message) message = errorBody.message;
    } catch {
      // ignore
    }

    if (response.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard.";
    }
    if (response.status === HttpStatus.TooManyRequests) {
      message = "Rate limit exceeded (429). Please wait a bit and try again.";
    }
    throw new OpenWeatherError(message, response.status);
  }

  const weatherResponse = (await response.json()) as OpenWeatherCurrentResponse;
  return toResult(weatherResponse, params.display);
}

export async function fetchCurrentWeatherByQuery(params: {
  query: string;
  signal?: AbortSignal;
}): Promise<WeatherResult> {
  const trimmedQuery = params.query.trim();
  const geocodeResult = await fetchGeocodeTopResult({
    query: trimmedQuery,
    signal: params.signal
  });

  const displayLocationName = [geocodeResult.name, geocodeResult.state].filter(Boolean).join(", ");
  return await fetchCurrentWeatherByCoords({
    lat: geocodeResult.lat,
    lon: geocodeResult.lon,
    signal: params.signal,
    display: { locationName: displayLocationName, countryCode: geocodeResult.country }
  });
}

export function openWeatherIconUrl(iconId: string): string {
  // "2x" PNG is reliable and easy to render
  return `${OPENWEATHER_ICON_BASE_URL}/${iconId}@2x.png`;
}

