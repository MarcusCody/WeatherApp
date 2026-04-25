import * as React from "react";
import { Autocomplete, IconButton, Stack, TextField, Tooltip } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

import { ThemeMode } from "@/common/enums";
import type { LocationSuggestion } from "@/services/openWeather";

export type SearchBarValue = { query: string };

export function SearchBar(props: {
  value: SearchBarValue;
  onChange: (next: SearchBarValue) => void;
  onSubmit: () => void;
  suggestions?: LocationSuggestion[];
  isSuggesting?: boolean;
  onSelectSuggestion?: (suggestion: LocationSuggestion) => void;
  isLoading?: boolean;
}) {
  const {
    value,
    onChange,
    onSubmit,
    isLoading,
    suggestions = [],
    isSuggesting,
    onSelectSuggestion
  } = props;

  // UX: if input already has value and user focuses it, clear it so they can type immediately.
  // If they blur without typing anything, restore the previous value.
  const prevValueRef = React.useRef<string | null>(null);

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
      <Autocomplete
        fullWidth
        freeSolo
        disableClearable
        loading={Boolean(isSuggesting)}
        options={suggestions}
        slotProps={{
          paper: {
            sx: (theme) => ({
              mt: 1,
              borderRadius: theme.radius.lg,
              overflow: "hidden",
              // Less transparent dropdown so it's readable over the background
              backgroundColor:
                theme.palette.mode === ThemeMode.Dark
                  ? "rgba(25, 20, 45, 0.92)"
                  : "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.18)"
            })
          },
          listbox: {
            sx: {
              py: 0.5,
              "& .MuiAutocomplete-option": {
                py: 1.25
              }
            }
          }
        }}
        filterOptions={(x) => x} // server-side filtering
        getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt.label)}
        getOptionKey={(opt) =>
          typeof opt === "string" ? opt : `${opt.label}-${opt.lat}-${opt.lon}`
        }
        onChange={(_, next) => {
          if (typeof next === "string" || !next) return;
          onSelectSuggestion?.(next);
        }}
        inputValue={value.query}
        onInputChange={(_, next) => onChange({ query: next })}
        renderInput={(params) => {
          const { inputProps, InputLabelProps, InputProps, ...rest } = params;

          return (
            <TextField
              {...rest}
              variant="filled"
              label="Country"
              placeholder="e.g. Singapore"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit();
              }}
              InputProps={InputProps}
              slotProps={{
                htmlInput: {
                  ...inputProps,
                  "aria-label": "Country"
                },
                // keep label visible (small) even when there's a value
                inputLabel: {
                  ...InputLabelProps,
                  shrink: true
                }
              }}
              sx={{
                "& .MuiFilledInput-root": {
                  height: 60,
                  borderRadius: (theme) => theme.radius.md,
                  bgcolor: "rgba(255,255,255,0.22)",
                  backdropFilter: "blur(10px)",
                  overflow: "hidden"
                },
                // Remove Filled underline
                "& .MuiFilledInput-root:before, & .MuiFilledInput-root:after": {
                  display: "none"
                }
              }}
              onFocus={() => {
                const current = value.query;
                if (current.trim()) {
                  prevValueRef.current = current;
                  onChange({ query: "" });
                }
              }}
              onBlur={() => {
                if (!value.query.trim() && prevValueRef.current) {
                  onChange({ query: prevValueRef.current });
                  prevValueRef.current = null;
                } else {
                  prevValueRef.current = null;
                }
              }}
            />
          );
        }}
      />
      <Tooltip title="Search">
        <span>
          <IconButton
            color="primary"
            onClick={onSubmit}
            disabled={isLoading}
            sx={{
              width: 60,
              height: 60,
              borderRadius: (theme) => theme.radius.md,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": { bgcolor: "primary.dark" }
            }}
            aria-label="Search"
          >
            <SearchRoundedIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
