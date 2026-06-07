// Import react-grab before react-dom so bippy installs its DevTools hook
// before React injects its renderer. This mirrors the recommended setup
// (loading react-grab early, e.g. a `beforeInteractive` script tag) and is
// what lets prop overrides reach the live renderer.
import { init } from "react-grab";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    initReactGrab: typeof init;
  }
}

window.initReactGrab = init;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
