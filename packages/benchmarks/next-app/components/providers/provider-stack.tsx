"use client";
import React, { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { I18nProvider } from "./i18n-provider";
import { FeatureFlagProvider } from "./feature-flag-provider";
import { NotificationProvider } from "./notification-provider";
import { AnalyticsProvider } from "./analytics-provider";

export function ProviderStack({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <FeatureFlagProvider>
            <NotificationProvider>
              <AnalyticsProvider>{children}</AnalyticsProvider>
            </NotificationProvider>
          </FeatureFlagProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
