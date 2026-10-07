import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init, formatElementInfo } from "react-grab";
import { freeze, unfreeze } from "react-grab/primitives";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    initReactGrab: typeof init;
    formatElementInfo: typeof formatElementInfo;
    freezeReactGrab: typeof freeze;
    unfreezeReactGrab: typeof unfreeze;
  }
}

window.initReactGrab = init;
window.formatElementInfo = formatElementInfo;
window.freezeReactGrab = freeze;
window.unfreezeReactGrab = unfreeze;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
