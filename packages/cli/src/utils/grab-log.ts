import fs from "node:fs";
import path from "node:path";
import { HISTORY_FILE_NAME } from "./clipboard.js";
import { MAX_READ_HISTORY_BYTES } from "./constants.js";

const CURSOR_FILE_NAME = "cursor.txt";

const cursorFilePath = (dir: string): string => path.join(dir, CURSOR_FILE_NAME);
const historyFilePath = (dir: string): string => path.join(dir, HISTORY_FILE_NAME);

const fileSize = (filePath: string): number => {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
};

// Byte offset into history.jsonl, not a line index: the file is append-only and
// never compacted, so a byte offset lets a poll detect "nothing new" by size in
// O(1) and read only the unconsumed tail.
export const readGrabCursor = (dir: string): number => {
  try {
    const value = Number.parseInt(fs.readFileSync(cursorFilePath(dir), "utf8").trim(), 10);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
};

// Atomic via temp + rename so a crash mid-write can't leave a truncated cursor
// (which would replay the whole history).
const writeGrabCursor = (dir: string, offset: number): void => {
  const target = cursorFilePath(dir);
  const tempPath = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, String(offset));
  fs.renameSync(tempPath, target);
};

const readHistoryRange = (dir: string, start: number, length: number): string => {
  if (length <= 0) return "";
  const fd = fs.openSync(historyFilePath(dir), "r");
  try {
    const buffer = Buffer.allocUnsafe(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, start);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
};

// Whole-history read for `--all`; the cursor path reads incrementally instead.
export const readCompleteGrabLines = (dir: string): string[] => {
  const size = fileSize(historyFilePath(dir));
  if (size === 0) return [];
  const raw = readHistoryRange(dir, 0, size);
  const lastNewline = raw.lastIndexOf("\n");
  if (lastNewline < 0) return [];
  return raw.slice(0, lastNewline).split("\n").filter(Boolean);
};

interface ConsumeGrabsOptions {
  limit: number;
  all: boolean;
  // Grabs captured longer ago than this are stale and skipped (the cursor still
  // advances past them). 0 disables eviction. Records without a numeric
  // receivedAt are never evicted.
  maxAgeMs: number;
}

// Reads only the unconsumed tail (capped at MAX_READ_HISTORY_BYTES; a larger
// backlog drains over several calls) and advances the cursor past every record it
// examines, so stale/skipped records are never re-seen. `all` replays the whole
// history without moving the cursor.
export const consumeGrabs = (dir: string, options: ConsumeGrabsOptions): string[] => {
  if (options.all) return readCompleteGrabLines(dir);

  const size = fileSize(historyFilePath(dir));
  const cursor = readGrabCursor(dir);
  // A cursor past EOF means the history was truncated/rotated under us; restart.
  const start = cursor > size ? 0 : cursor;
  if (start >= size) {
    // Persist a truncation reset even with nothing to read, or a later-grown file
    // would be read from the stale offset and skip its leading records.
    if (start !== cursor) writeGrabCursor(dir, start);
    return [];
  }

  const chunk = readHistoryRange(dir, start, Math.min(size - start, MAX_READ_HISTORY_BYTES));
  const lastNewline = chunk.lastIndexOf("\n");
  if (lastNewline < 0) return [];

  const now = Date.now();
  const fresh: string[] = [];
  let consumedBytes = 0;
  let lineStart = 0;
  while (lineStart <= lastNewline && (options.limit <= 0 || fresh.length < options.limit)) {
    const newlineIndex = chunk.indexOf("\n", lineStart);
    const line = chunk.slice(lineStart, newlineIndex);
    consumedBytes += Buffer.byteLength(chunk.slice(lineStart, newlineIndex + 1), "utf8");
    lineStart = newlineIndex + 1;
    if (line.length === 0) continue;
    let parsed: { receivedAt?: unknown };
    try {
      parsed = JSON.parse(line);
    } catch {
      // Corrupt line, or a mid-line fragment from an old line-index cursor read
      // as a byte offset; skip it (the cursor still advances past it).
      continue;
    }
    if (options.maxAgeMs > 0 && typeof parsed.receivedAt === "number") {
      if (now - parsed.receivedAt > options.maxAgeMs) continue;
    }
    fresh.push(line);
  }

  const nextCursor = start + consumedBytes;
  if (nextCursor !== cursor) writeGrabCursor(dir, nextCursor);
  return fresh;
};
