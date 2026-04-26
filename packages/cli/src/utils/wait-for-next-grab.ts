import type { ReadClipboardPayloadResult } from "./read-clipboard-payload.js";
import type { ReactGrabPayload } from "./parse-react-grab-payload.js";

export interface WaitForNextGrabOptions {
  initialTimestamp: number | null;
  // True iff the initial read returned non-empty raw clipboard data, even
  // if parseReactGrabPayload then rejected it. When true and
  // initialTimestamp is null (parse failed on something that *was* there),
  // the first successfully-parsed observation is treated as the new
  // baseline rather than a match - otherwise a stale grab on the clipboard
  // would be mistakenly returned as if it were a fresh selection.
  initialRawPayloadPresent: boolean;
  timeoutMs: number;
  pollIntervalMs: number;
  read: () => Promise<ReadClipboardPayloadResult>;
  signal?: AbortSignal;
  getCurrentMs?: () => number;
  sleepMs?: (durationMs: number) => Promise<void>;
}

interface WaitForNextGrabMatch {
  outcome: "match";
  result: ReadClipboardPayloadResult;
  payload: ReactGrabPayload;
}

interface WaitForNextGrabUnrecoverable {
  outcome: "unrecoverable";
  result: ReadClipboardPayloadResult;
}

interface WaitForNextGrabTimeout {
  outcome: "timeout";
}

interface WaitForNextGrabAborted {
  outcome: "aborted";
}

export type WaitForNextGrabResult =
  | WaitForNextGrabMatch
  | WaitForNextGrabUnrecoverable
  | WaitForNextGrabTimeout
  | WaitForNextGrabAborted;

const defaultSleepMs = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

export const waitForNextGrab = async (
  options: WaitForNextGrabOptions,
): Promise<WaitForNextGrabResult> => {
  const { initialTimestamp, initialRawPayloadPresent, timeoutMs, pollIntervalMs, read, signal } =
    options;
  const getCurrentMs = options.getCurrentMs ?? Date.now;
  const sleepMs = options.sleepMs ?? defaultSleepMs;
  const deadlineMs = timeoutMs > 0 ? getCurrentMs() + timeoutMs : Number.POSITIVE_INFINITY;

  // Mutable baseline. When initialTimestamp is null because the initial
  // parse failed on a non-empty clipboard, the first successfully-parsed
  // observation is adopted as the new baseline (instead of being returned
  // as a "match") so we never surface a stale grab as fresh. When initial
  // was genuinely empty (rawPayloadPresent false), the first non-null
  // observation is a real match - the user clicked a grab after watch
  // started, which is what they want.
  let baselineTimestamp = initialTimestamp;
  let baselineLocked = initialTimestamp !== null || !initialRawPayloadPresent;

  while (true) {
    if (signal?.aborted) return { outcome: "aborted" };

    const result = await read();
    if (!result.recoverable) {
      return { outcome: "unrecoverable", result };
    }

    if (result.payload) {
      if (!baselineLocked) {
        baselineTimestamp = result.payload.timestamp;
        baselineLocked = true;
      } else if (result.payload.timestamp !== baselineTimestamp) {
        return { outcome: "match", result, payload: result.payload };
      }
    }

    if (getCurrentMs() >= deadlineMs) return { outcome: "timeout" };
    await sleepMs(pollIntervalMs);
  }
};
