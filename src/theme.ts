import { createTheme } from "@mui/material/styles";
import "@mui/material/styles";

import { ThemeMode } from "@/common/enums";

export const radius = {
  xs: "2px",
  sm: "12px",
  md: "20px",
  lg: "24px",
  xl: "40px"
} as const;

export function buildTheme(mode: ThemeMode) {
  return createTheme({
    radius,
    palette: {
      mode,
      ...(mode === ThemeMode.Light
        ? {
            background: { default: "#b69cff", paper: "rgba(255,255,255,0.22)" },
            primary: { main: "#6a45d1" },
            secondary: { main: "#6C40B5" },
            text: { primary: "#000000", secondary: "#666666" }
          }
        : {
            background: { default: "#140c2b", paper: "rgba(30,18,60,0.40)" },
            primary: { main: "#b69cff" },
            secondary: { main: "#6C40B5" },
            text: { primary: "#FFFFFF", secondary: "#FFFFFF" }
          })
    },
    shape: { borderRadius: 18 },
    typography: {
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
    }
  });
}

