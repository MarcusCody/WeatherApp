import * as React from "react";
import { Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";

import { buildTheme } from "@/theme";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { ThemeMode } from "@/common/enums";
import { WeatherPage } from "@/containers/Weather/WeatherPage";

export function App() {
  const [mode, setMode] = useLocalStorageState<ThemeMode>("wwa.theme", ThemeMode.Light);
  const theme = React.useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          // Background image from Figma assets (served from public/assets).
          // Keep a gradient overlay so it still looks OK if the image is missing.
          backgroundImage:
            mode === ThemeMode.Light
              ? "linear-gradient(135deg, rgba(182,156,255,0.55), rgba(123,92,255,0.55)), url('/assets/bg-light.png')"
              : "linear-gradient(135deg, rgba(18,10,40,0.55), rgba(42,21,96,0.55)), url('/assets/bg-dark.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed"
        }}
      >
        <WeatherPage
          mode={mode}
          onToggleMode={() => setMode(mode === ThemeMode.Light ? ThemeMode.Dark : ThemeMode.Light)}
        />
      </Box>
    </ThemeProvider>
  );
}
