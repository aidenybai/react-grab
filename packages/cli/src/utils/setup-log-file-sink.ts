import fs from "node:fs";
import { PROJECT_LOG_GITIGNORE_CONTENT } from "./constants.js";
import { resolveLogFileSinkLocation } from "./resolve-log-file-sink-location.js";

export interface LogFileSink {
  append: (line: string) => void;
  path: string;
}

export interface LogFileSinkSetupOk {
  outcome: "ok";
  sink: LogFileSink;
}

export interface LogFileSinkSetupSkipped {
  outcome: "skipped";
  reason: string;
}

export type LogFileSinkSetup = LogFileSinkSetupOk | LogFileSinkSetupSkipped;

const errorReason = (caughtError: unknown): string =>
  caughtError instanceof Error ? caughtError.message : String(caughtError);

export const setupLogFileSink = (cwd: string = process.cwd()): LogFileSinkSetup => {
  const location = resolveLogFileSinkLocation(cwd);
  try {
    fs.mkdirSync(location.dir, { recursive: true });
  } catch (caughtError) {
    return {
      outcome: "skipped",
      reason: `Could not create ${location.dir}: ${errorReason(caughtError)}`,
    };
  }

  // Best-effort gitignore so the log file never lands in version control. We
  // only write if missing - never overwrite a user-curated gitignore, even
  // if its contents already happen to match what we would write.
  if (!fs.existsSync(location.gitignorePath)) {
    try {
      fs.writeFileSync(location.gitignorePath, PROJECT_LOG_GITIGNORE_CONTENT, "utf8");
    } catch {
      // Non-fatal: the directory exists, the log file will still work, the
      // user just gets a directory git might pick up. Surface nothing.
    }
  }

  // Probe writability up front so a read-only / unwritable parent surfaces
  // as `skipped` with a usable hint instead of a silent broken sink. The
  // empty append creates the file if missing without writing any bytes.
  try {
    fs.appendFileSync(location.logPath, "");
  } catch (caughtError) {
    return {
      outcome: "skipped",
      reason: `Could not open ${location.logPath} for append: ${errorReason(caughtError)}`,
    };
  }

  return {
    outcome: "ok",
    sink: {
      path: location.logPath,
      append: (line: string) => {
        try {
          fs.appendFileSync(location.logPath, `${line}\n`);
        } catch {
          // Best-effort: the file mirror exists for resilience, not durable
          // bookkeeping. A transient ENOSPC / EROFS / EBADF must not take
          // down the daemon - stdout consumers still receive the line.
        }
      },
    },
  };
};
