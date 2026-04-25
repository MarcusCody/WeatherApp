import * as React from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import { GlassCard } from "@/components/GlassCard";

export type SearchHistoryItem = {
  id: string;
  query: string;
  lastSearchedAtIso: string;
  // Optional: if selection came from autocomplete, store coords for stable re-search
  lat?: number;
  lon?: number;
};

export function SearchHistory(props: {
  items: SearchHistoryItem[];
  onSearch: (item: SearchHistoryItem) => void;
  onDelete: (id: string) => void;
  /** When false, renders without an outer GlassCard (for embedding inside a larger container). */
  wrap?: boolean;
}) {
  const { items, onSearch, onDelete, wrap = true } = props;

  const Content = (
    <>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Search History
      </Typography>

      {items.length === 0 ? (
        <Typography sx={{ opacity: 0.75 }}>No history yet. Search for a city above.</Typography>
      ) : (
        <Stack spacing={1.25}>
          {items.map((it) => (
            <Box
              key={it.id}
              sx={{
                borderRadius: (theme) => theme.radius.md,
                overflow: "hidden",
                bgcolor: "rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.18)",
                px: { xs: 2, md: 2.5 },
                py: { xs: 1.5, md: 1.75 }
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Box
                  onClick={() => onSearch(it)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSearch(it);
                  }}
                  sx={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  aria-label={`Search ${it.query}`}
                >
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {it.query}
                  </Typography>
                  {/* Mobile: datetime under the location */}
                  <Typography
                    sx={{ opacity: 0.75, fontSize: 13, display: { xs: "block", md: "none" } }}
                    noWrap
                  >
                    {new Date(it.lastSearchedAtIso).toLocaleString()}
                  </Typography>
                </Box>

                {/* Desktop: datetime before the action icons (matches Figma) */}
                <Typography
                  sx={{
                    opacity: 0.75,
                    fontSize: 13,
                    display: { xs: "none", md: "block" },
                    whiteSpace: "nowrap"
                  }}
                >
                  {new Date(it.lastSearchedAtIso).toLocaleString()}
                </Typography>

                <Stack direction="row" spacing={1}>
                  <IconButton
                    aria-label={`Search ${it.query}`}
                    onClick={() => onSearch(it)}
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: "rgba(255,255,255,0.70)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.85)" }
                    }}
                  >
                    <SearchRoundedIcon />
                  </IconButton>
                  <IconButton
                    aria-label={`Delete ${it.query}`}
                    onClick={() => onDelete(it.id)}
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: "rgba(255,255,255,0.70)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.85)" }
                    }}
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </>
  );

  if (!wrap) return <Box>{Content}</Box>;

  return <GlassCard sx={{ borderRadius: 10 }}>{Content}</GlassCard>;
}
