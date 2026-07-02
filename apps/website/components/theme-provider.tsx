"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

// Passes children via spread instead of a checked JSX child: next-themes gets
// `children` from `extends React.PropsWithChildren`, and when @types/react
// fails to resolve from next-themes' package location (seen on Vercel's
// restored-cache pnpm layout, hidden by skipLibCheck) that member silently
// vanishes and a direct `<NextThemesProvider>{children}<...>` fails to build.
export const ThemeProvider = (props: React.PropsWithChildren<ThemeProviderProps>) => (
  <NextThemesProvider {...props} />
);
