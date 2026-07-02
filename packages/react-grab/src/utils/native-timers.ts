// Browser-only signatures: with @types/node present, `window.setTimeout`'s
// declared type merges Node's Timeout-returning overloads, which poisons
// every call site's ReturnType inference.
interface ScheduleTimerFunction {
  (handler: () => void, delayMs?: number): number;
}

interface ClearTimerFunction {
  (timerId: number | undefined): void;
}

const isClientSide = typeof window !== "undefined";

const noopSchedule: ScheduleTimerFunction = () => 0;
const noopClear: ClearTimerFunction = () => {};

// Captured at module load, before the time machine's page-clock freeze wraps
// the window timer functions (mirroring native-raf.ts): react-grab's own UI —
// hold-to-repeat scrubbing, flash timers — must keep ticking while the page's
// scheduling is suspended during a rewind.
export const nativeSetTimeout: ScheduleTimerFunction = isClientSide
  ? window.setTimeout.bind(window)
  : noopSchedule;

export const nativeClearTimeout: ClearTimerFunction = isClientSide
  ? window.clearTimeout.bind(window)
  : noopClear;

export const nativeSetInterval: ScheduleTimerFunction = isClientSide
  ? window.setInterval.bind(window)
  : noopSchedule;

export const nativeClearInterval: ClearTimerFunction = isClientSide
  ? window.clearInterval.bind(window)
  : noopClear;
