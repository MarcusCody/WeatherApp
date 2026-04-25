import * as React from "react";
import { Alert, Box, Container, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";

import { SearchBar, SearchBarValue } from "@/components/SearchBar";
import { WeatherCard } from "@/components/WeatherCard";
import { SearchHistory, SearchHistoryItem } from "@/components/SearchHistory";
import { GlassCard } from "@/components/GlassCard";
import { ThemeMode } from "@/common/enums";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import {
  LocationSuggestion,
  OpenWeatherError,
  fetchCurrentWeatherByCoords,
  fetchCurrentWeatherByQuery,
  searchLocations
} from "@/services/openWeather";
import { newId } from "@/utils/id";

function normalizeInput(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function validateInput(v: SearchBarValue): string | null {
  if (!normalizeInput(v.query)) return "Please enter a country (e.g. Singapore).";
  return null;
}

function parseLabelToDisplay(label: string): { locationName: string; countryCode: string } | null {
  // Expected format from our suggestions: "City, State?, CC"
  const parts = label
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const countryCode = parts[parts.length - 1];
  const locationName = parts.slice(0, -1).join(", ");
  if (!countryCode || !locationName) return null;
  return { locationName, countryCode };
}

export function WeatherPage(props: { mode: ThemeMode; onToggleMode: () => void }) {
  const { mode, onToggleMode } = props;

  const [query, setQuery] = React.useState<SearchBarValue>({ query: "Singapore" });
  const [weather, setWeather] = React.useState<null | Awaited<
    ReturnType<typeof fetchCurrentWeatherByQuery>
  >>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [history, setHistory] = useLocalStorageState<SearchHistoryItem[]>("wwa.history", []);
  const inFlight = React.useRef<AbortController | null>(null);
  const suggestFlight = React.useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);

  const runSearch = React.useCallback(
    async (
      next: SearchBarValue,
      opts?: {
        addToHistory?: boolean;
        coords?: {
          lat: number;
          lon: number;
          label?: string;
          display?: { locationName: string; countryCode: string };
        };
      }
    ) => {
      const q = normalizeInput(next.query);
      const validation = validateInput({ query: q });
      if (validation) {
        setError(validation);
        return;
      }

      setError(null);
      setIsLoading(true);
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const res = opts?.coords
          ? await fetchCurrentWeatherByCoords({
              lat: opts.coords.lat,
              lon: opts.coords.lon,
              display: opts.coords.display,
              signal: controller.signal
            })
          : await fetchCurrentWeatherByQuery({ query: q, signal: controller.signal });
        setWeather(res);

        if (opts?.addToHistory !== false) {
          const record: SearchHistoryItem = {
            id: newId(),
            query: opts?.coords?.label ?? q,
            lastSearchedAtIso: new Date().toISOString(),
            lat: opts?.coords?.lat,
            lon: opts?.coords?.lon
          };

          setHistory((prev) => {
            const filtered = prev.filter((p) => !(p.query.toLowerCase() === q.toLowerCase()));
            return [record, ...filtered].slice(0, 10);
          });
        }
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        if (e instanceof OpenWeatherError) {
          setError(e.message);
        } else if (e instanceof Error) {
          setError(e.message || "Something went wrong. Please try again.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setHistory]
  );

  React.useEffect(() => {
    void runSearch(query, { addToHistory: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const q = normalizeInput(query.query);
    if (q.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      suggestFlight.current?.abort();
      return;
    }

    setIsSuggesting(true);
    suggestFlight.current?.abort();
    const controller = new AbortController();
    suggestFlight.current = controller;

    const t = window.setTimeout(async () => {
      try {
        const res = await searchLocations({ query: q, limit: 6, signal: controller.signal });
        setSuggestions(res);
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query.query]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 5 } }}>
      <Box sx={{ maxWidth: 780, mx: "auto", width: "100%" }}>
        <Stack gap={10}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ flex: 1 }}>
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={() => void runSearch(query)}
                suggestions={suggestions}
                isSuggesting={isSuggesting}
                onSelectSuggestion={(s) => {
                  setQuery({ query: s.label });
                  void runSearch(
                    { query: s.label },
                    {
                      coords: {
                        lat: s.lat,
                        lon: s.lon,
                        label: s.label,
                        display: {
                          locationName: [s.name, s.state].filter(Boolean).join(", "),
                          countryCode: s.country
                        }
                      }
                    }
                  );
                }}
                isLoading={isLoading}
              />
            </Box>
            <Tooltip title={mode === ThemeMode.Light ? "Switch to dark" : "Switch to light"}>
              <IconButton
                aria-label="Toggle theme"
                onClick={onToggleMode}
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: (theme) => theme.radius.md,
                  bgcolor: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.22)"
                }}
              >
                {mode === ThemeMode.Light ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
              </IconButton>
            </Tooltip>
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

          {/* Single outer container wrapping Today's Weather + Search History (matches Figma) */}
          <GlassCard
            sx={{
              borderRadius: (theme) => theme.radius.xl,
              overflow: "visible",
              p: { xs: 3, md: 6 }
            }}
          >
            {/* Weather section */}
            <Box sx={{ pb: { xs: "18px", md: "22px" } }}>
              <WeatherCard weather={weather} isLoading={isLoading} wrap={false} />
            </Box>

            {/* Inner background container for history (matches Figma) */}
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
                onSearch={(it) => {
                  const next = { query: it.query };
                  setQuery(next);
                  void runSearch(
                    next,
                    it.lat != null && it.lon != null
                      ? {
                          coords: {
                            lat: it.lat,
                            lon: it.lon,
                            label: it.query,
                            display: parseLabelToDisplay(it.query) ?? undefined
                          }
                        }
                      : undefined
                  );
                }}
                onDelete={(id) => setHistory((prev) => prev.filter((x) => x.id !== id))}
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
