import { BREAKPOINTS } from "@/lib/constants";

export type Breakpoint = keyof typeof BREAKPOINTS;

export function getBreakpointValue(bp: Breakpoint): number {
  return BREAKPOINTS[bp];
}

export function getMediaQuery(bp: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[bp]}px)`;
}

export function isBreakpointUp(bp: Breakpoint, width: number): boolean {
  return width >= BREAKPOINTS[bp];
}

export function isBreakpointDown(bp: Breakpoint, width: number): boolean {
  return width < BREAKPOINTS[bp];
}

export function getCurrentBreakpoint(width: number): Breakpoint {
  const entries = Object.entries(BREAKPOINTS) as [Breakpoint, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  for (const [name, minWidth] of sorted) {
    if (width >= minWidth) return name;
  }
  return "sm";
}

export function getResponsiveValue<T>(
  width: number,
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T,
): T {
  const entries = Object.entries(BREAKPOINTS) as [Breakpoint, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  for (const [name, minWidth] of sorted) {
    if (width >= minWidth && values[name] !== undefined) {
      return values[name] as T;
    }
  }
  return defaultValue;
}

export const CONTAINER_WIDTHS: Record<Breakpoint, string> = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};
