import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init } from "react-grab";
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
