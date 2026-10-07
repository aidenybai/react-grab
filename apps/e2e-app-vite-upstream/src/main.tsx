import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { formatElementInfo, init } from "react-grab";
import { App } from "./app";
import "./styles.css";

window.formatElementInfo = formatElementInfo;
window.initReactGrab = init;

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing fixture root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
