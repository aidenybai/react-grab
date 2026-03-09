"use client";

import { useState, useEffect } from "react";
import { BREAKPOINTS } from "@/lib/constants";
import { getCurrentBreakpoint, type Breakpoint } from "@/lib/responsive";

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("sm");

  useEffect(() => {
    const updateBreakpoint = () => {
      setBreakpoint(getCurrentBreakpoint(window.innerWidth));
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return breakpoint;
}

export function useBreakpointUp(bp: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [bp]);

  return matches;
}
