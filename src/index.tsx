import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline } from "@mui/material";

import { App } from "@/App";
import "@/styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);

