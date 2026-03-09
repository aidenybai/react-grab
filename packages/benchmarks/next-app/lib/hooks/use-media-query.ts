"use client";

import { useState, useEffect, useCallback } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useBreakpoint() {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isLargeDesktop = useMediaQuery("(min-width: 1280px)");

  return { isMobile, isTablet, isDesktop, isLargeDesktop };
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

export function useIsPortrait(): boolean {
  return useMediaQuery("(orientation: portrait)");
}

export function useMediaQueryCallback(
  query: string,
  callback: (matches: boolean) => void,
): boolean {
  const matches = useMediaQuery(query);

  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    stableCallback(matches);
  }, [matches, stableCallback]);

  return matches;
}

export default useMediaQuery;
