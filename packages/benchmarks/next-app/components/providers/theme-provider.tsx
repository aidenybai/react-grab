"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

const ThemeContext = createContext<{
  theme: string;
  setTheme: (t: string) => void;
}>({
  theme: "light",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState("light");
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
