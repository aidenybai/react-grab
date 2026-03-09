export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  ring: string;
}

export const lightTheme: ThemeColors = {
  background: "#ffffff",
  foreground: "#0f172a",
  card: "#ffffff",
  cardForeground: "#0f172a",
  primary: "#2563eb",
  primaryForeground: "#ffffff",
  secondary: "#f1f5f9",
  secondaryForeground: "#0f172a",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  accent: "#f1f5f9",
  accentForeground: "#0f172a",
  destructive: "#ef4444",
  border: "#e2e8f0",
  ring: "#2563eb",
};

export const darkTheme: ThemeColors = {
  background: "#0f172a",
  foreground: "#f8fafc",
  card: "#1e293b",
  cardForeground: "#f8fafc",
  primary: "#3b82f6",
  primaryForeground: "#ffffff",
  secondary: "#1e293b",
  secondaryForeground: "#f8fafc",
  muted: "#1e293b",
  mutedForeground: "#94a3b8",
  accent: "#1e293b",
  accentForeground: "#f8fafc",
  destructive: "#dc2626",
  border: "#334155",
  ring: "#3b82f6",
};

export const FONT_SIZES = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
} as const;

export const SPACING = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;

export const BORDER_RADIUS = {
  none: "0",
  sm: "0.125rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;
