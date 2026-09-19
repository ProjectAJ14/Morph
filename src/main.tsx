import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// The type system is part of the design system, so the faces ship with the app.
// A desktop tool must not reach for a font CDN it may not be able to see —
// these are the families named by --font-disp / --font-body / --font-mono.
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/800.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
