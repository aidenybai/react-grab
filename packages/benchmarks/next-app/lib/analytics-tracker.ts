import type { AnalyticsEvent } from "@/lib/types";
import { logger } from "@/lib/logger";

interface AnalyticsProvider {
  name: string;
  track: (event: AnalyticsEvent) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name: string, properties?: Record<string, unknown>) => void;
}

const providers: AnalyticsProvider[] = [];

export function registerProvider(provider: AnalyticsProvider): void {
  providers.push(provider);
  logger.debug(`Analytics provider registered: ${provider.name}`);
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  logger.debug("Tracking event", { event: name, properties });

  for (const provider of providers) {
    try {
      provider.track(event);
    } catch (err) {
      logger.error(`Analytics tracking failed for ${provider.name}`, err);
    }
  }
}

export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  for (const provider of providers) {
    try {
      provider.identify(userId, traits);
    } catch (err) {
      logger.error(`Analytics identify failed for ${provider.name}`, err);
    }
  }
}

export function trackPageView(
  pageName: string,
  properties?: Record<string, unknown>,
): void {
  for (const provider of providers) {
    try {
      provider.page(pageName, properties);
    } catch (err) {
      logger.error(`Analytics page view failed for ${provider.name}`, err);
    }
  }
}

export const AnalyticsEvents = {
  USER_SIGNED_UP: "user_signed_up",
  USER_LOGGED_IN: "user_logged_in",
  BOOKING_CREATED: "booking_created",
  BOOKING_CANCELLED: "booking_cancelled",
  SETTINGS_UPDATED: "settings_updated",
  INTEGRATION_CONNECTED: "integration_connected",
  EXPORT_DOWNLOADED: "export_downloaded",
} as const;
