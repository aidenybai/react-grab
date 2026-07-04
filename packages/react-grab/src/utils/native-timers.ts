// Browser-only signatures: with @types/node present, `window.setTimeout`'s
// declared type merges Node's Timeout-returning overloads, which poisons
// every call site's ReturnType inference.
interface ScheduleTimerFunction {
  (handler: () => void, delayMs?: number): number;
}

interface ClearTimerFunction {
  (timerId: number | undefined): void;
}

interface UnwrappedTimerFunctions {
  setTimeout: ScheduleTimerFunction;
  clearTimeout: ClearTimerFunction;
  setInterval: ScheduleTimerFunction;
  clearInterval: ClearTimerFunction;
}

// Unlike requestAnimationFrame, the timer functions live as own properties of
// the window instance (not on Window.prototype), so there is no prototype to
// recover natives from once the time machine's page-clock freeze wraps them.
// And this module lives in the lazily-loaded renderer chunk, which evaluates
// AFTER those wrappers install — binding window.setTimeout at module load
// would capture the wrapper and react-grab's own UI timers (hold-to-repeat
// scrubbing, flash timers) would park during a rewind. Instead the page-clock
// module registers the pre-wrapper functions it captured at interception
// time, and every call resolves through that registry, falling back to the
// live window functions when no interception has installed.
let unwrappedTimers: UnwrappedTimerFunctions | null = null;

export const registerUnwrappedTimers = (timers: UnwrappedTimerFunctions): void => {
  unwrappedTimers ??= timers;
};

export const nativeSetTimeout: ScheduleTimerFunction = (handler, delayMs) =>
  unwrappedTimers
    ? unwrappedTimers.setTimeout(handler, delayMs)
    : window.setTimeout(handler, delayMs);

export const nativeClearTimeout: ClearTimerFunction = (timerId) => {
  if (unwrappedTimers) {
    unwrappedTimers.clearTimeout(timerId);
  } else {
    window.clearTimeout(timerId);
  }
};

export const nativeSetInterval: ScheduleTimerFunction = (handler, delayMs) =>
  unwrappedTimers
    ? unwrappedTimers.setInterval(handler, delayMs)
    : window.setInterval(handler, delayMs);

export const nativeClearInterval: ClearTimerFunction = (timerId) => {
  if (unwrappedTimers) {
    unwrappedTimers.clearInterval(timerId);
  } else {
    window.clearInterval(timerId);
  }
};
