import { Command } from "commander";
import {
  MS_PER_SECOND,
  WATCH_DEFAULT_TIMEOUT_MS,
  WATCH_POLL_INTERVAL_MS,
} from "../utils/constants.js";
import { formatPayload } from "../utils/format-payload.js";
import { parseTimeoutSeconds } from "../utils/parse-timeout-seconds.js";
import {
  readClipboardPayload,
  type ReadClipboardPayloadResult,
} from "../utils/read-clipboard-payload.js";
import type { ReactGrabPayload } from "../utils/parse-react-grab-payload.js";
import { waitForNextGrab } from "../utils/wait-for-next-grab.js";

interface WatchCommandOptions {
  json?: boolean;
  timeout: string;
}

const fail = (message: string, exitCode: number): never => {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
};

export const formatResultForStdout = (payload: ReactGrabPayload, asJson?: boolean): string =>
  asJson ? JSON.stringify(payload) : formatPayload(payload);

const printPayload = (payload: ReactGrabPayload, asJson?: boolean): void => {
  process.stdout.write(`${formatResultForStdout(payload, asJson)}\n`);
};

const formatUnrecoverableMessage = (result: ReadClipboardPayloadResult): string =>
  result.hint ?? `Clipboard channel is unavailable in this environment (${result.env}).`;

const resolveTimeoutSeconds = (raw: string): number => {
  try {
    return parseTimeoutSeconds(raw);
  } catch (caughtError) {
    return fail(caughtError instanceof Error ? caughtError.message : String(caughtError), 2);
  }
};

export const watch = new Command()
  .name("watch")
  .description("wait for the next React Grab selection on the clipboard, print it, exit")
  .option("--json", "print the raw ReactGrabPayload JSON instead of formatted text")
  .option(
    "-t, --timeout <seconds>",
    "seconds to wait before giving up (0 = forever)",
    String(WATCH_DEFAULT_TIMEOUT_MS / MS_PER_SECOND),
  )
  .action(async (rawOptions: WatchCommandOptions) => {
    const timeoutSeconds = resolveTimeoutSeconds(rawOptions.timeout);

    const initialResult = await readClipboardPayload();
    if (!initialResult.recoverable) {
      fail(formatUnrecoverableMessage(initialResult), 2);
    }

    const initialTimestamp = initialResult.payload?.timestamp ?? null;

    process.stderr.write("Waiting for React Grab clipboard...\n");

    const waitResult = await waitForNextGrab({
      initialTimestamp,
      timeoutMs: timeoutSeconds * MS_PER_SECOND,
      pollIntervalMs: WATCH_POLL_INTERVAL_MS,
      read: readClipboardPayload,
    });

    switch (waitResult.outcome) {
      case "match":
        printPayload(waitResult.payload, rawOptions.json);
        process.exit(0);
        break;
      case "unrecoverable":
        fail(formatUnrecoverableMessage(waitResult.result), 2);
        break;
      case "timeout":
        fail(
          `Timed out after ${timeoutSeconds}s without a new React Grab clipboard payload.\nClick an element in the React Grab toolbar and re-run.`,
          1,
        );
        break;
      case "aborted":
        fail("Aborted before a new React Grab payload arrived.", 1);
        break;
      default: {
        const exhaustive: never = waitResult;
        fail(`Unhandled watch outcome: ${JSON.stringify(exhaustive)}`, 2);
      }
    }
  });
