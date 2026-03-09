"use client";
import React, {
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from "react";

interface AnalyticsContextType {
  track: (event: string, data?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  track: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const track = useCallback((event: string, data?: Record<string, unknown>) => {
    console.log("[analytics]", event, data);
  }, []);
  return (
    <AnalyticsContext.Provider value={{ track }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
