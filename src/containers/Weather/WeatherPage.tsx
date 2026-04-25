import * as React from "react";
import { Alert, Box, Container, Stack, Typography } from "@mui/material";

import { SearchBar, SearchBarValue } from "@/components/SearchBar";
import { WeatherCard } from "@/components/WeatherCard";
import { SearchHistory, SearchHistoryItem } from "@/components/SearchHistory";
import { GlassCard } from "@/components/GlassCard";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { ThemeMode } from "@/common/enums";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import {
  LocationSuggestion,
  OpenWeatherError,
  WeatherResult,
  fetchCurrentWeatherByCoords,
  fetchCurrentWeatherByQuery,
  searchLocations
} from "@/services/openWeather";
import { newId } from "@/utils/id";

const DEFAULT_QUERY = "Singapore";
const HISTORY_STORAGE_KEY = "wwa.history";
const HISTORY_MAX_ITEMS = 10;

const SUGGEST_MIN_CHARS = 2;
const SUGGEST_LIMIT = 6;
const SUGGEST_DEBOUNCE_MS = 300;

type DisplayInfo = { locationName: string; countryCode: string };

type CoordsOptions = {
  lat: number;
  lon: number;
  label?: string;
  display?: DisplayInfo;
};

function normalizeQuery(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function validateQuery(q: string): string | null {
  if (!q) return "Please enter a country (e.g. Singapore).";
  return null;
}

function parseLabelToDisplay(label: string): DisplayInfo | undefined {
  // Expected suggestion format: "City, State?, CC"
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

function suggestionToCoords(s: LocationSuggestion): CoordsOptions {
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

function historyItemToCoords(it: SearchHistoryItem): CoordsOptions | undefined {
  if (it.lat == null || it.lon == null) return undefined;
  return {
    lat: it.lat,
    lon: it.lon,
    label: it.query,
    display: parseLabelToDisplay(it.query)
  };
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

function useDebouncedSuggestions(rawQuery: string) {
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = React.useState(false);

  React.useEffect(() => {
    const q = normalizeQuery(rawQuery);
    if (q.length < SUGGEST_MIN_CHARS) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    setIsSuggesting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await searchLocations({
          query: q,
          limit: SUGGEST_LIMIT,
          signal: controller.signal
        });
        setSuggestions(res);
      } catch (e) {
        if (isAbortError(e)) return;
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [rawQuery]);

  return { suggestions, isSuggesting };
}

export function WeatherPage(props: { mode: ThemeMode; onToggleMode: () => void }) {
  const { mode, onToggleMode } = props;

  const [query, setQuery] = React.useState<SearchBarValue>({ query: DEFAULT_QUERY });
  const [weather, setWeather] = React.useState<WeatherResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = useLocalStorageState<SearchHistoryItem[]>(
    HISTORY_STORAGE_KEY,
    []
  );

  const inFlight = React.useRef<AbortController | null>(null);
  const { suggestions, isSuggesting } = useDebouncedSuggestions(query.query);

  const runSearch = React.useCallback(
    async (rawQuery: string, opts?: { addToHistory?: boolean; coords?: CoordsOptions }) => {
      const q = normalizeQuery(rawQuery);
      const validationError = validateQuery(q);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setIsLoading(true);
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

  React.useEffect(() => {
    void runSearch(DEFAULT_QUERY, { addToHistory: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => void runSearch(query.query);

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    setQuery({ query: s.label });
    void runSearch(s.label, { coords: suggestionToCoords(s) });
  };

  const handleHistorySearch = (it: SearchHistoryItem) => {
    setQuery({ query: it.query });
    void runSearch(it.query, { coords: historyItemToCoords(it) });
  };

  const handleHistoryDelete = (id: string) => {
    setHistory((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <Box sx={{ maxWidth: 780, mx: "auto", width: "100%" }}>
        <Stack gap={10}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmit}
                suggestions={suggestions}
                isSuggesting={isSuggesting}
                onSelectSuggestion={handleSelectSuggestion}
                isLoading={isLoading}
              />
            </Box>
            <ThemeToggleButton mode={mode} onToggle={onToggleMode} />
          </Stack>

          {error ? (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ borderRadius: 999, alignItems: "center" }}
            >
              {error}
            </Alert>
          ) : null}

          {/* Outer container wraps Today's Weather + Search History (matches Figma) */}
          <GlassCard
            sx={{
              borderRadius: (theme) => theme.radius.xl,
              overflow: "visible",
              p: { xs: 3, md: 6 }
            }}
          >
            <Box sx={{ pb: { xs: "18px", md: "22px" } }}>
              <WeatherCard weather={weather} isLoading={isLoading} wrap={false} />
            </Box>

            <Box
              sx={{
                borderRadius: (theme) => theme.radius.lg,
                bgcolor: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.16)",
                p: { xs: 2, md: 3 },
                overflow: "hidden"
              }}
            >
              <SearchHistory
                wrap={false}
                items={history}
                onSearch={handleHistorySearch}
                onDelete={handleHistoryDelete}
              />
            </Box>
          </GlassCard>

          <Typography variant="caption" sx={{ opacity: 0.7, textAlign: "center", pt: 1 }}>
            Powered by OpenWeather. Search by country name (or any location text).
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}
