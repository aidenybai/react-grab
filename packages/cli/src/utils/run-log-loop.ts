import { CLIPBOARD_POLL_INTERVAL_MS } from "./constants.js";
import { extractPromptAndContent } from "./extract-prompt-and-content.js";
import type { ReadClipboardPayloadResult } from "./read-clipboard-payload.js";
import { waitForNextGrab } from "./wait-for-next-grab.js";

export interface RunLogLoopOptions {
  initialResult: ReadClipboardPayloadResult;
  read: () => Promise<ReadClipboardPayloadResult>;
  write: (line: string) => void;
  appendToFile?: (line: string) => void;
  // When true, the loop returns `{outcome: "ok"}` after emitting the first
  // match instead of streaming forever. Used in piped mode (`log | head -n 1`)
  // so the upstream pipeline doesn't wait on log's poll loop after the
  // consumer closes the read side.
  exitOnFirstMatch?: boolean;
  signal?: AbortSignal;
  getCurrentMs?: () => number;
  sleepMs?: (durationMs: number) => Promise<void>;
}

export interface RunLogLoopOk {
  outcome: "ok";
}

export interface RunLogLoopFail {
  outcome: "fail";
  message: string;
  exitCode: number;
}

export type RunLogLoopExit = RunLogLoopOk | RunLogLoopFail;

const formatUnrecoverableMessage = (result: ReadClipboardPayloadResult): string =>
  result.hint ?? `Clipboard channel is unavailable in this environment (${result.env}).`;

export const runLogLoop = async (options: RunLogLoopOptions): Promise<RunLogLoopExit> => {
  if (!options.initialResult.recoverable) {
    return {
      outcome: "fail",
      message: formatUnrecoverableMessage(options.initialResult),
      exitCode: 2,
    };
  }

  let baselineTimestamp = options.initialResult.payload?.timestamp ?? null;
  let baselineRawPresent = options.initialResult.rawPayloadPresent;

  while (true) {
    const waitResult = await waitForNextGrab({
      initialTimestamp: baselineTimestamp,
      initialRawPayloadPresent: baselineRawPresent,
      // 0 = forever. The log loop deliberately has no idle timeout so a
      // user idling between grabs (sometimes for hours, e.g. running through
      // a backlog) doesn't see the daemon quietly exit.
      timeoutMs: 0,
      pollIntervalMs: CLIPBOARD_POLL_INTERVAL_MS,
      read: options.read,
      signal: options.signal,
      getCurrentMs: options.getCurrentMs,
      sleepMs: options.sleepMs,
    });

    switch (waitResult.outcome) {
      case "match": {
        const line = JSON.stringify(extractPromptAndContent(waitResult.payload));
        options.write(line);
        options.appendToFile?.(line);
        if (options.exitOnFirstMatch) return { outcome: "ok" };
        baselineTimestamp = waitResult.payload.timestamp;
        baselineRawPresent = true;
        break;
      }
      case "unrecoverable":
        return {
          outcome: "fail",
          message: formatUnrecoverableMessage(waitResult.result),
          exitCode: 2,
        };
      case "aborted":
        return {
          outcome: "fail",
          message: "Aborted before a new React Grab payload arrived.",
          exitCode: 1,
        };
      case "timeout":
        // Unreachable: timeoutMs is 0 (forever). Kept for exhaustiveness.
        return {
          outcome: "fail",
          message: "Unexpected idle timeout in log loop.",
          exitCode: 2,
        };
      default: {
        const exhaustive: never = waitResult;
        return {
          outcome: "fail",
          message: `Unhandled log outcome: ${JSON.stringify(exhaustive)}`,
          exitCode: 2,
        };
      }
    }
  }
};
