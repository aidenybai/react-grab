"use client";

import { useEffect } from "react";

// next/script SSRs an inline placeholder inside the page tree, which triggers a
// hydration mismatch (and React never executes hydrated script tags anyway), so
// the bundle is appended to <head> imperatively instead.
export const ReactGrabLoader = () => {
  useEffect(() => {
    if ("__REACT_GRAB__" in window) return;
    if (document.querySelector("script[data-react-grab-loader]")) return;
    const script = document.createElement("script");
    script.src = "/script.js";
    script.dataset.reactGrabLoader = "true";
    // A transient load failure would otherwise leave the marker tag in <head>
    // and block every future attempt for the session.
    script.onerror = () => script.remove();
    document.head.appendChild(script);
  }, []);

  return null;
};

ReactGrabLoader.displayName = "ReactGrabLoader";
