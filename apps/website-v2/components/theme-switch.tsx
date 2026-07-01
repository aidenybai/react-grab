"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
      className="cursor-pointer text-prose underline decoration-prose/30 underline-offset-[3px] transition-colors hover:text-label hover:decoration-label"
      suppressHydrationWarning
    >
      {mounted ? (next === "dark" ? "Dark mode" : "Light mode") : "Theme"}
    </button>
  );
};
