"use client";

import { useState, useEffect } from "react";

export function matchMediaQuery(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

export function useMediaQueryMatch(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQueryMatch("(prefers-reduced-motion: reduce)");
}

export function usePrefersDarkMode(): boolean {
  return useMediaQueryMatch("(prefers-color-scheme: dark)");
}

export function usePrefersHighContrast(): boolean {
  return useMediaQueryMatch("(prefers-contrast: high)");
}

export const MEDIA_QUERIES = {
  mobile: "(max-width: 639px)",
  tablet: "(min-width: 640px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
  touch: "(hover: none) and (pointer: coarse)",
  mouse: "(hover: hover) and (pointer: fine)",
  landscape: "(orientation: landscape)",
  portrait: "(orientation: portrait)",
  retina: "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)",
} as const;
