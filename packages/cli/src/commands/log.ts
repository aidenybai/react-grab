import { Command } from "commander";
import { readClipboardPayload } from "../utils/read-clipboard-payload.js";
import { runLogLoop } from "../utils/run-log-loop.js";
import { setupLogFileSink } from "../utils/setup-log-file-sink.js";

class ExitSignal extends Error {
  constructor(public readonly exitCode: number) {
    super("");
  }
}

const fail = (message: string, exitCode: number): never => {
  // `process.exit` can truncate buffered stderr when the consumer is a pipe
  // (every agent tool harness reads our stderr through a pipe). Using the
  // write-callback form guarantees the buffer drains before exit. The throw
  // halts synchronous execution; the action wrapper swallows ExitSignal so
  // the user only sees the message we just wrote.
  process.stderr.write(`${message}\n`, () => process.exit(exitCode));
  throw new ExitSignal(exitCode);
};

export const log = new Command()
  .name("log")
  .description("stream every React Grab selection as NDJSON until killed")
  .action(async () => {
    try {
      // EPIPE on stdout means a consumer (e.g. `head -n 1`) closed early.
      // Without this handler, Node prints an unhandled-error warning before
      // tearing down. We exit cleanly so the pipeline reports 0.
      process.stdout.on("error", (caughtError) => {
        if (caughtError instanceof Error && "code" in caughtError && caughtError.code === "EPIPE") {
          process.exit(0);
        }
      });

      const initialResult = await readClipboardPayload();

      let appendToFile: ((line: string) => void) | undefined;
      if (initialResult.recoverable) {
        process.stderr.write("Streaming React Grab clipboard...\n");
        const sinkSetup = setupLogFileSink();
        if (sinkSetup.outcome === "ok") {
          appendToFile = sinkSetup.sink.append;
          process.stderr.write(`Mirroring to ${sinkSetup.sink.path}\n`);
        } else {
          process.stderr.write(`File mirror disabled: ${sinkSetup.reason}\n`);
        }
      }

      // When stdout is not a TTY (piped to head, redirected to file, etc.)
      // we exit cleanly after the first match so the upstream pipeline
      // doesn't wait on the otherwise-forever poll loop. TTY users still
      // get continuous streaming.
      const exitOnFirstMatch = process.stdout.isTTY !== true;

      const result = await runLogLoop({
        initialResult,
        read: readClipboardPayload,
        write: (line) => {
          process.stdout.write(`${line}\n`);
        },
        appendToFile,
        exitOnFirstMatch,
      });
      if (result.outcome === "fail") return fail(result.message, result.exitCode);
      // outcome: "ok" - just return; Node drains stdout/stderr and exits 0.
    } catch (caughtError) {
      // ExitSignal carries the user-facing message via the stderr write
      // already in flight from `fail`. Just let Node finish; process.exit
      // fires from the write callback once stderr drains.
      if (caughtError instanceof ExitSignal) return;
      throw caughtError;
    }
  });
