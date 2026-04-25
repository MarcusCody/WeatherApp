import * as React from "react";
import { Paper, PaperProps } from "@mui/material";

export function GlassCard(props: PaperProps) {
  return (
    <Paper
      elevation={0}
      {...props}
      sx={[
        {
          backgroundColor: "background.paper",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.18)"
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx])
      ]}
    />
  );
}
