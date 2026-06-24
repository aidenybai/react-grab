"use client";

import { formatElementInfo, init } from "react-grab";

declare global {
  interface Window {
    initReactGrab: typeof init;
    formatElementInfo: typeof formatElementInfo;
  }
}

// Importing react-grab auto-initializes it and sets window.__REACT_GRAB__ (the
// side-effect in react-grab's entry runs once the module evaluates on the
// client; the typeof window guard skips it during SSR). We mirror the Vite
// fixture's window.initReactGrab / formatElementInfo at module scope so they are
// present as soon as this client chunk runs, matching the Vite main.tsx.
if (typeof window !== "undefined") {
  window.initReactGrab = init;
  window.formatElementInfo = formatElementInfo;
}

export function ReactGrabClient() {
  return null;
}
