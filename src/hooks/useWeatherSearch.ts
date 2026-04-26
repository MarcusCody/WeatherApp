import * as React from "react";

import { SearchHistoryItem } from "@/components/SearchHistory";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import {
  LocationSuggestion,
  OpenWeatherError,
  WeatherResult,
  fetchCurrentWeatherByCoords,
  fetchCurrentWeatherByQuery
} from "@/services/openWeather";
import { newId } from "@/utils/id";

const HISTORY_STORAGE_KEY = "wwa.history";
const HISTORY_MAX_ITEMS = 10;

export type DisplayInfo = { locationName: string; countryCode: string };

export type CoordsOptions = {
  lat: number;
  lon: number;
  label?: string;
  display?: DisplayInfo;
};

export type RunSearchOptions = {
  addToHistory?: boolean;
  coords?: CoordsOptions;
};

export function normalizeQuery(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function validateQuery(q: string): string | null {
  if (!q) return "Please enter a country (e.g. Singapore).";
  return null;
}

function isAbortError(e: unknown): boolean {
  return (e as { name?: string })?.name === "AbortError";
}

function getErrorMessage(e: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (e instanceof OpenWeatherError) return e.message;
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

/** Parses a "City, State?, CC" label into display fields. */
export function parseLabelToDisplay(label: string): DisplayInfo | undefined {
  const parts = label
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return undefined;

  const countryCode = parts[parts.length - 1];
  const locationName = parts.slice(0, -1).join(", ");
  if (!countryCode || !locationName) return undefined;
  return { locationName, countryCode };
}

export function suggestionToCoords(s: LocationSuggestion): CoordsOptions {
  return {
    lat: s.lat,
    lon: s.lon,
    label: s.label,
    display: {
      locationName: [s.name, s.state].filter(Boolean).join(", "),
      countryCode: s.country
    }
  };
}

export function historyItemToCoords(it: SearchHistoryItem): CoordsOptions | undefined {
  if (it.lat == null || it.lon == null) return undefined;
  return {
    lat: it.lat,
    lon: it.lon,
    label: it.query,
    display: parseLabelToDisplay(it.query)
  };
}

export function useWeatherSearch() {
  const [weather, setWeather] = React.useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = useLocalStorageState<SearchHistoryItem[]>(
    HISTORY_STORAGE_KEY,
    []
  );
  const inFlight = React.useRef<AbortController | null>(null);

  const runSearch = React.useCallback(
    async (rawQuery: string, opts?: RunSearchOptions) => {
      const q = normalizeQuery(rawQuery);
      const validationError = validateQuery(q);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setIsLoading(true);
      // Abort the previous search if it's still in flight.
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const result = opts?.coords
          ? await fetchCurrentWeatherByCoords({
              lat: opts.coords.lat,
              lon: opts.coords.lon,
              display: opts.coords.display,
              signal: controller.signal
            })
          : await fetchCurrentWeatherByQuery({ query: q, signal: controller.signal });
        setWeather(result);

        if (opts?.addToHistory !== false) {
          const record: SearchHistoryItem = {
            id: newId(),
            query: opts?.coords?.label ?? q,
            lastSearchedAtIso: new Date().toISOString(),
            lat: opts?.coords?.lat,
            lon: opts?.coords?.lon
          };
          setHistory((prev) => {
            const filtered = prev.filter((p) => p.query.toLowerCase() !== q.toLowerCase());
            return [record, ...filtered].slice(0, HISTORY_MAX_ITEMS);
          });
        }
      } catch (e) {
        if (isAbortError(e)) return;
        setError(getErrorMessage(e));
      } finally {
        setIsLoading(false);
      }
    },
    [setHistory]
  );

  const clearError = React.useCallback(() => setError(null), []);

  const deleteHistoryItem = React.useCallback(
    (id: string) => setHistory((prev) => prev.filter((x) => x.id !== id)),
    [setHistory]
  );

  return {
    weather,
    isLoading,
    error,
    history,
    runSearch,
    clearError,
    deleteHistoryItem
  };
}
