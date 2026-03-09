"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

interface I18nContextType {
  locale: string;
  setLocale: (l: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState("en");
  return (
    <I18nContext.Provider value={{ locale, setLocale, t: (key) => key }}>
      {children}
    </I18nContext.Provider>
  );
}
