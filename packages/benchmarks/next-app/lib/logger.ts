type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  return `${prefix} ${entry.message}${ctx}`;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("debug")) return;
    console.debug(formatEntry(createEntry("debug", message, context)));
  },

  info(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("info")) return;
    console.info(formatEntry(createEntry("info", message, context)));
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (!shouldLog("warn")) return;
    console.warn(formatEntry(createEntry("warn", message, context)));
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (!shouldLog("error")) return;
    const entry = createEntry("error", message, {
      ...context,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : error,
    });
    console.error(formatEntry(entry));
  },
};

export default logger;
