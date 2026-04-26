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

class ExitSignal extends Error {
  constructor(public readonly exitCode: number) {
    super("");
  }
}

// `process.exit` can truncate buffered stderr when the consumer is a pipe
// (every agent tool harness reads our stderr through a pipe). Using the
// write-callback form guarantees the buffer drains before exit. The throw
// halts synchronous execution; the action wrapper swallows ExitSignal so
// the user only sees the message we just wrote.
const fail = (message: string, exitCode: number): never => {
  process.stderr.write(`${message}\n`, () => process.exit(exitCode));
  throw new ExitSignal(exitCode);
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
    try {
      const timeoutSeconds = resolveTimeoutSeconds(rawOptions.timeout);

      const initialResult = await readClipboardPayload();
      if (!initialResult.recoverable) {
        // Use `return fail(...)` not `fail(...)` so TS control-flow
        // analysis sees this branch as terminating; the throw inside fail
        // also halts synchronously, but the explicit return makes the
        // contract obvious to readers and protects against fail ever being
        // refactored to a non-throwing variant.
        return fail(formatUnrecoverableMessage(initialResult), 2);
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
          // Don't process.exit(0) here: an immediate exit can truncate
          // stdout when the writer is piped through another process.
          // Returning lets Node drain the buffer and exit naturally with
          // code 0.
          printPayload(waitResult.payload, rawOptions.json);
          return;
        case "unrecoverable":
          return fail(formatUnrecoverableMessage(waitResult.result), 2);
        case "timeout":
          return fail(
            `Timed out after ${timeoutSeconds}s without a new React Grab clipboard payload.\nClick an element in the React Grab toolbar and re-run.`,
            1,
          );
        case "aborted":
          return fail("Aborted before a new React Grab payload arrived.", 1);
        default: {
          const exhaustive: never = waitResult;
          return fail(`Unhandled watch outcome: ${JSON.stringify(exhaustive)}`, 2);
        }
      }
    } catch (caughtError) {
      // ExitSignal carries the user-facing message via the stderr write
      // already in flight from `fail`. Just let Node finish; process.exit
      // fires from the write callback once stderr drains.
      if (caughtError instanceof ExitSignal) return;
      throw caughtError;
    }
  });
