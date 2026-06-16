import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init, formatElementInfo } from "react-grab";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    initReactGrab: typeof init;
    formatElementInfo: typeof formatElementInfo;
  }
}

window.initReactGrab = init;
window.formatElementInfo = formatElementInfo;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
