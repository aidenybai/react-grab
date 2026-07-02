"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { LINK_CLASS_NAME } from "@/components/prose";
import { cn } from "@/lib/utils";

/**
 * Text-based light/dark toggle matching the mono footer chrome. Gated on mount
 * to avoid a hydration mismatch, since the resolved theme isn't known on the
 * server.
 */
export const ThemeSwitch = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className={cn("cursor-pointer whitespace-nowrap", LINK_CLASS_NAME)}
      suppressHydrationWarning
    >
      {mounted ? (next === "dark" ? "Dark mode" : "Light mode") : "Theme"}
    </button>
  );
};
