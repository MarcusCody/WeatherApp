import * as React from "react";
import { IconButton, Tooltip } from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";

import { ThemeMode } from "@/common/enums";

export interface ThemeToggleButtonProps {
  mode: ThemeMode;
  onToggle: () => void;
}

export function ThemeToggleButton(props: ThemeToggleButtonProps) {
  const { mode, onToggle } = props;
  const isLight = mode === ThemeMode.Light;

  return (
    <Tooltip title={isLight ? "Switch to dark" : "Switch to light"}>
      <IconButton
        aria-label="Toggle theme"
        onClick={onToggle}
        sx={{
          width: 60,
          height: 60,
          borderRadius: (theme) => theme.radius.md,
          bgcolor: "rgba(255,255,255,0.22)",
          border: "1px solid rgba(255,255,255,0.22)"
        }}
      >
        {isLight ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
      </IconButton>
    </Tooltip>
  );
}
