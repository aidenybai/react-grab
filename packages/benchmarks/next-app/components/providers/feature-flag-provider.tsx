"use client";
import React, { createContext, useContext, ReactNode } from "react";

interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  isEnabled: (flag: string) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  isEnabled: () => true,
});

export const useFeatureFlags = () => useContext(FeatureFlagContext);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const flags = { darkMode: true, newDashboard: true, betaFeatures: false };
  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        isEnabled: (flag) => flags[flag as keyof typeof flags] ?? false,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}
