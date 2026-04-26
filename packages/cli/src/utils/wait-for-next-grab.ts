import type { ReadClipboardPayloadResult } from "./read-clipboard-payload.js";
import type { ReactGrabPayload } from "./parse-react-grab-payload.js";

export interface WaitForNextGrabOptions {
  initialTimestamp: number | null;
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
  const { initialTimestamp, timeoutMs, pollIntervalMs, read, signal } = options;
  const getCurrentMs = options.getCurrentMs ?? Date.now;
  const sleepMs = options.sleepMs ?? defaultSleepMs;
  const deadlineMs = timeoutMs > 0 ? getCurrentMs() + timeoutMs : Number.POSITIVE_INFINITY;

  while (true) {
    if (signal?.aborted) return { outcome: "aborted" };

    const result = await read();
    if (!result.recoverable) {
      return { outcome: "unrecoverable", result };
    }

    if (result.payload && result.payload.timestamp !== initialTimestamp) {
      return { outcome: "match", result, payload: result.payload };
    }

    if (getCurrentMs() >= deadlineMs) return { outcome: "timeout" };
    await sleepMs(pollIntervalMs);
  }
};
