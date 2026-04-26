import * as React from "react";
import { Alert, Box, Container, Stack, Typography } from "@mui/material";

import { SearchBar, SearchBarValue } from "@/components/SearchBar";
import { WeatherCard } from "@/components/WeatherCard";
import { SearchHistory, SearchHistoryItem } from "@/components/SearchHistory";
import { GlassCard } from "@/components/GlassCard";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { ThemeMode } from "@/common/enums";
import {
  historyItemToCoords,
  normalizeQuery,
  suggestionToCoords,
  useWeatherSearch
} from "@/hooks/useWeatherSearch";
import { LocationSuggestion, searchLocations } from "@/services/openWeather";

const DEFAULT_QUERY = "Singapore";

const SUGGEST_MIN_CHARS = 2;
const SUGGEST_LIMIT = 6;
const SUGGEST_DEBOUNCE_MS = 300;

function useDebouncedSuggestions(rawQuery: string) {
  const [suggestions, setSuggestions] = React.useState<LocationSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const q = normalizeQuery(rawQuery);
    const requestId = ++requestIdRef.current;

    if (q.length < SUGGEST_MIN_CHARS) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    setSuggestions([]);
    setIsSuggesting(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await searchLocations({
          query: q,
          limit: SUGGEST_LIMIT,
          signal: controller.signal
        });
        if (requestId !== requestIdRef.current) return;
        setSuggestions(res);
      } catch (e) {
        if ((e as { name?: string })?.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
      } finally {
        if (requestId !== requestIdRef.current) return;
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
  const { weather, isLoading, error, history, runSearch, clearError, deleteHistoryItem } =
    useWeatherSearch();
  const { suggestions, isSuggesting } = useDebouncedSuggestions(query.query);

  // Run a search for the default query when the component mounts.
  React.useEffect(() => {
    void runSearch(DEFAULT_QUERY, { addToHistory: false });
  }, []);

  // Handle the submission of the search query.
  const handleSubmit = () => void runSearch(query.query);

  // Handle the selection of a location suggestion from the autocomplete list.
  const handleSelectSuggestion = (locationSuggestion: LocationSuggestion) => {
    setQuery({ query: locationSuggestion.label });
    void runSearch(locationSuggestion.label, { coords: suggestionToCoords(locationSuggestion) });
  };

  // Handle the selection of a search history item from the history list.
  const handleHistorySearch = (searchHistoryItem: SearchHistoryItem) => {
    setQuery({ query: searchHistoryItem.query });
    void runSearch(searchHistoryItem.query, { coords: historyItemToCoords(searchHistoryItem) });
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
              onClose={clearError}
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
                onDelete={deleteHistoryItem}
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
