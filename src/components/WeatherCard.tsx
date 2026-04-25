import * as React from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";

import { GlassCard } from "@/components/GlassCard";
import { WeatherResult } from "@/services/openWeather";
import { formatDateTime } from "@/utils/time";

export function WeatherCard(props: {
  weather: WeatherResult | null;
  isLoading?: boolean;
  /** When false, renders without an outer GlassCard (for embedding inside a larger container). */
  wrap?: boolean;
}) {
  const { weather, isLoading, wrap = true } = props;

  const temp = weather ? `${Math.round(weather.tempC)}°` : "—";
  const hi = weather ? `${Math.round(weather.tempMaxC)}°` : "—";
  const lo = weather ? `${Math.round(weather.tempMinC)}°` : "—";

  const condition = (weather?.condition ?? "").toLowerCase();
  const isClear = condition.includes("clear");

  const content = (
    <>
      {weather ? (
        <Box
          sx={{
            position: "absolute",
            zIndex: 2,
            right: { xs: 14, md: 0 },
            // Mobile: hang the icon across the top border like desktop/Figma
            // Move mobile icon down so it aligns with the temperature block (Figma)
            top: { xs: -80, md: -150 },
            width: { xs: 157, md: 300 },
            height: { xs: 157, md: 300 },
            pointerEvents: "none"
          }}
        >
          <Box
            component="img"
            src={isClear ? "/assets/sun.png" : "/assets/cloud.png"}
            alt={weather.description}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 38px 34px rgba(0,0,0,0.22))"
            }}
          />
        </Box>
      ) : null}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2.5, md: 4 }}
        alignItems="stretch"
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ opacity: 0.85, fontWeight: 600 }}>
            Today’s Weather
          </Typography>

          {/* Mobile (Figma): (Temp ↔ Condition), (H/L ↔ Humidity), (Location ↔ Datetime) */}
          <Box sx={{ display: { xs: "block", md: "none" }, mt: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  letterSpacing: -3,
                  lineHeight: 1,
                  color: "secondary.main",
                  opacity: weather || isLoading ? 1 : 0.45
                }}
              >
                {temp}
              </Typography>
              <Typography sx={{ color: "text.secondary" }} noWrap>
                {weather ? weather.condition : "—"}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
              <Typography sx={{ color: "text.primary" }} noWrap>
                H: {hi} L: {lo}
              </Typography>
              <Typography sx={{ color: "text.secondary" }} noWrap>
                Humidity: {weather ? `${weather.humidityPct}%` : "—"}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "text.secondary" }} noWrap>
                {weather
                  ? `${weather.locationName}, ${weather.countryCode}`
                  : "Search a city to begin"}
              </Typography>
              <Typography sx={{ color: "text.secondary" }} noWrap>
                {weather ? formatDateTime(weather.updatedAt) : "—"}
              </Typography>
            </Stack>
          </Box>

          {/* Desktop: keep temp + H/L in the left block */}
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1,
                mt: 1,
                mb: 1.5,
                color: "secondary.main",
                opacity: weather || isLoading ? 1 : 0.45
              }}
            >
              {temp}
            </Typography>
            <Typography sx={{ color: "text.primary", mb: 1.5 }}>
              H: {hi} L: {lo}
            </Typography>
          </Box>
        </Box>
        {/* Desktop-only right column spacer (icon overlap) */}
        <Stack
          direction="column"
          justifyContent="flex-end"
          alignItems="flex-end"
          sx={{
            display: { xs: "none", md: "flex" },
            width: 340,
            position: "relative"
          }}
        >
          <Box sx={{ height: 80 }} />
        </Stack>
      </Stack>

      {/* Desktop: single horizontal info line (Location → Datetime → Humidity → Condition) */}
      <Stack
        direction="row"
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          flexWrap: "nowrap",
          justifyContent: "space-between"
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.secondary" }} noWrap>
          {weather ? `${weather.locationName}, ${weather.countryCode}` : "—"}
        </Typography>
        <Typography sx={{ color: "text.secondary" }} noWrap>
          {weather ? formatDateTime(weather.updatedAt) : "—"}
        </Typography>
        <Typography sx={{ color: "text.secondary" }} noWrap>
          Humidity: {weather ? `${weather.humidityPct}%` : "—"}
        </Typography>
        <Typography sx={{ color: "text.secondary" }} noWrap>
          {weather ? weather.condition : "—"}
        </Typography>
      </Stack>
    </>
  );

  if (!wrap) {
    // Embedded mode: no radius/overflow so the outer container controls clipping.
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "visible"
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <GlassCard
      sx={{
        borderRadius: (theme) => theme.radius.xl,
        position: "relative",
        overflow: "hidden",
        p: { xs: 2.75, md: 4 }
      }}
    >
      {content}
    </GlassCard>
  );
}
