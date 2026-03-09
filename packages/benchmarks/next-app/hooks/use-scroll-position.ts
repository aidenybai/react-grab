"use client";

import { useState, useEffect } from "react";

interface ScrollPosition {
  x: number;
  y: number;
}

export function useScrollPosition(throttleMs = 100): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({ x: 0, y: 0 });

  useEffect(() => {
    let rafId: number | null = null;
    let lastUpdate = 0;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setPosition({ x: window.scrollX, y: window.scrollY });
          lastUpdate = Date.now();
        });
        return;
      }
      setPosition({ x: window.scrollX, y: window.scrollY });
      lastUpdate = now;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [throttleMs]);

  return position;
}

export function useIsScrolled(threshold = 10): boolean {
  const { y } = useScrollPosition();
  return y > threshold;
}
