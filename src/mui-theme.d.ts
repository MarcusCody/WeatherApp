import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    radius: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  }

  interface ThemeOptions {
    radius?: {
      xs?: string;
      sm?: string;
      md?: string;
      lg?: string;
      xl?: string;
    };
  }
}

