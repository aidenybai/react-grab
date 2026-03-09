export const APP_NAME = "Acme Dashboard";
export const APP_VERSION = "2.4.1";
export const APP_DESCRIPTION = "Enterprise analytics and management platform";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.acme.dev/v1";
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "wss://ws.acme.dev";

export const AUTH_TOKEN_KEY = "acme_auth_token";
export const REFRESH_TOKEN_KEY = "acme_refresh_token";
export const SESSION_DURATION = 60 * 60 * 24 * 7;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  SETTINGS: "/settings",
  PROFILE: "/settings/profile",
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  ANALYTICS: "/dashboard/analytics",
  NOTIFICATIONS: "/dashboard/notifications",
  USERS: "/dashboard/users",
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  suspended: "Suspended",
  archived: "Archived",
};

export const STATUS_COLORS: Record<string, string> = {
  active: "green",
  inactive: "gray",
  pending: "yellow",
  suspended: "red",
  archived: "blue",
};

export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_EXPORT: false,
  ENABLE_BETA_FEATURES: process.env.NODE_ENV === "development",
} as const;
