import fs from "node:fs";
import path from "node:path";
import { HISTORY_FILE_NAME } from "./clipboard.js";

const CURSOR_FILE_NAME = "cursor.txt";

const cursorFilePath = (dir: string): string => path.join(dir, CURSOR_FILE_NAME);

// Returns only complete (newline-terminated) records. Each grab is appended as a
// single JSON line ending in "\n", but a large grab is not one atomic write, so
// a concurrent reader can observe a half-written final line. Everything after
// the last newline is treated as an in-progress append and skipped until done.
export const readCompleteGrabLines = (dir: string): string[] => {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(dir, HISTORY_FILE_NAME), "utf8");
  } catch {
    return [];
  }
  const lastNewline = raw.lastIndexOf("\n");
  if (lastNewline < 0) return [];
  return raw.slice(0, lastNewline).split("\n").filter(Boolean);
};

export const readGrabCursor = (dir: string): number => {
  try {
    const value = Number.parseInt(fs.readFileSync(cursorFilePath(dir), "utf8").trim(), 10);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
};

interface ConsumeGrabsOptions {
  limit: number;
  all: boolean;
}

// Returns the grabs to emit, advancing the cursor only past what is returned so a
// backlog drains across calls without dropping any (`limit` of 0 means no cap).
// `all` replays the whole history without touching the cursor. The cursor is only
// rewritten when it actually moves, which also self-heals a cursor left past the
// end by a truncated history.
export const consumeGrabs = (dir: string, options: ConsumeGrabsOptions): string[] => {
  const lines = readCompleteGrabLines(dir);
  if (options.all) return lines;
  const cursor = readGrabCursor(dir);
  const start = Math.min(cursor, lines.length);
  const end = options.limit > 0 ? Math.min(start + options.limit, lines.length) : lines.length;
  if (end !== cursor) fs.writeFileSync(cursorFilePath(dir), String(end));
  return lines.slice(start, end);
};
