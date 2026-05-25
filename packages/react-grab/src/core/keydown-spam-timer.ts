export interface KeydownSpamTimer {
  /** Schedule the auto-dismiss callback. Replaces any previously scheduled timer. */
  schedule: (callback: () => void, delayMs: number) => void;
  /** Cancel a pending timer (no-op if none pending). */
  clear: () => void;
  /** Cancel and tear down. */
  dispose: () => void;
}

/**
 * Tracks the "keydown spam" auto-dismiss timer. When the overlay gets
 * stuck active (e.g. a modifier keyup was lost during a window blur),
 * repeated keydowns reschedule this timer; after ~200ms of idle keyboard
 * activity the overlay auto-dismisses.
 */
export const createKeydownSpamTimer = (): KeydownSpamTimer => {
  let timerId: number | null = null;

  const clear = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  };

  const schedule = (callback: () => void, delayMs: number) => {
    clear();
    timerId = window.setTimeout(() => {
      timerId = null;
      callback();
    }, delayMs);
  };

  return { schedule, clear, dispose: clear };
};
