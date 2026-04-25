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
  res: OpenWeatherCurrentResponse,
  display?: Partial<Pick<WeatherResult, "locationName" | "countryCode">>
): WeatherResult {
  const w = res.weather[0];
  const updatedAt = new Date((res.dt + res.timezone) * 1000);

  const base: WeatherResult = {
    locationName: res.name,
    countryCode: res.sys.country,
    updatedAt,
    tempC: res.main.temp,
    tempMinC: res.main.temp_min,
    tempMaxC: res.main.temp_max,
    humidityPct: res.main.humidity,
    condition: w?.main ?? "Unknown",
    description: w?.description ?? "Unknown",
    cloudPct: res.clouds?.all ?? 0,
    iconId: w?.icon ?? "01d"
  };

  return {
    ...base,
    locationName: display?.locationName ?? base.locationName,
    countryCode: display?.countryCode ?? base.countryCode
  };
}

export async function fetchCurrentWeather(params: {
  city: string;
  country: string;
  signal?: AbortSignal;
}): Promise<WeatherResult> {
  const { city, country, signal } = params;

  const apiKey = getOpenWeatherApiKey();
  const q = `${city},${country}`.trim();
  const url = new URL(OPENWEATHER_CURRENT_WEATHER_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  const r = await fetch(url.toString(), { method: "GET", signal });
  if (!r.ok) {
    let message = "Unable to fetch weather. Please try again.";
    try {
      const body = (await r.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }

    if (r.status === HttpStatus.NotFound) {
      message = "City / country not found. Please check your input and try again.";
    }
    if (r.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard. New keys can take a little time to activate.";
    }
    if (r.status === HttpStatus.TooManyRequests) {
      message =
        "Rate limit exceeded (429). Please wait a bit and try again (or use a different API key/plan).";
    }
    throw new OpenWeatherError(message, r.status);
  }

  const data = (await r.json()) as OpenWeatherCurrentResponse;
  return toResult(data);
}

async function fetchGeocodeTopResult(params: {
  query: string;
  signal?: AbortSignal;
}): Promise<OpenWeatherGeocodeDirectItem> {
  const apiKey = getOpenWeatherApiKey();
  const url = new URL(OPENWEATHER_GEOCODE_DIRECT_URL);
  url.searchParams.set("q", params.query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("appid", apiKey);

  const r = await fetch(url.toString(), { method: "GET", signal: params.signal });
  if (!r.ok) {
    let message = "Unable to search location. Please try again.";
    try {
      const body = (await r.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    if (r.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard.";
    }
    throw new OpenWeatherError(message, r.status);
  }

  const items = (await r.json()) as OpenWeatherGeocodeDirectItem[];
  const top = items[0];
  if (!top)
    throw new OpenWeatherError(
      "Location not found. Try a more specific name.",
      HttpStatus.NotFound
    );
  return top;
}

export function formatLocationLabel(it: OpenWeatherGeocodeDirectItem): string {
  // e.g. "Chicago, Illinois, US"
  return [it.name, it.state, it.country].filter(Boolean).join(", ");
}

function getLocationSuggestionId(it: OpenWeatherGeocodeDirectItem): string {
  return [it.name, it.state ?? "", it.country, it.lat, it.lon]
    .join("|")
    .toLowerCase();
}

function dedupeLocationSuggestions(items: LocationSuggestion[]): LocationSuggestion[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = it.label.toLowerCase();
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
  const q = params.query.trim();
  if (!q) return [];

  const apiKey = getOpenWeatherApiKey();
  const url = new URL(OPENWEATHER_GEOCODE_DIRECT_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(params.limit ?? 5));
  url.searchParams.set("appid", apiKey);

  const r = await fetch(url.toString(), { method: "GET", signal: params.signal });
  if (!r.ok) {
    let message = "Unable to search location. Please try again.";
    try {
      const body = (await r.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    if (r.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard.";
    }
    throw new OpenWeatherError(message, r.status);
  }

  const items = (await r.json()) as OpenWeatherGeocodeDirectItem[];
  return dedupeLocationSuggestions(
    items.map((it) => ({
      ...it,
      id: getLocationSuggestionId(it),
      label: formatLocationLabel(it)
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
  const url = new URL(OPENWEATHER_CURRENT_WEATHER_URL);
  url.searchParams.set("lat", String(params.lat));
  url.searchParams.set("lon", String(params.lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  const r = await fetch(url.toString(), { method: "GET", signal: params.signal });
  if (!r.ok) {
    let message = "Unable to fetch weather. Please try again.";
    try {
      const body = (await r.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }

    if (r.status === HttpStatus.Unauthorized) {
      message =
        "Invalid API key (401). Double-check OPENWEATHER_API_KEY in your .env (no quotes/spaces), and ensure the key is active in your OpenWeather dashboard.";
    }
    if (r.status === HttpStatus.TooManyRequests) {
      message = "Rate limit exceeded (429). Please wait a bit and try again.";
    }
    throw new OpenWeatherError(message, r.status);
  }

  const data = (await r.json()) as OpenWeatherCurrentResponse;
  return toResult(data, params.display);
}

export async function fetchCurrentWeatherByQuery(params: {
  query: string;
  signal?: AbortSignal;
}): Promise<WeatherResult> {
  const q = params.query.trim();
  const geo = await fetchGeocodeTopResult({ query: q, signal: params.signal });

  const displayLocationName = [geo.name, geo.state].filter(Boolean).join(", ");
  return await fetchCurrentWeatherByCoords({
    lat: geo.lat,
    lon: geo.lon,
    signal: params.signal,
    display: { locationName: displayLocationName, countryCode: geo.country }
  });
}

export function openWeatherIconUrl(iconId: string): string {
  // "2x" PNG is reliable and easy to render
  return `${OPENWEATHER_ICON_BASE_URL}/${iconId}@2x.png`;
}

