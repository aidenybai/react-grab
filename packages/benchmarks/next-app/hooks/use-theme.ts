"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type Theme = "light" | "dark" | "system";

export function useTheme(): {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
} {
  const [theme, setThemeValue] = useLocalStorage<Theme>("app-theme", "system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mql.matches ? "dark" : "light");

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeValue(newTheme);
    },
    [setThemeValue],
  );

  return { theme, resolvedTheme, setTheme };
}
