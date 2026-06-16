import fs from "node:fs";
import path from "node:path";
import { HISTORY_FILE_NAME } from "./clipboard.js";
import { MAX_READ_HISTORY_BYTES, MIGRATION_SCAN_CHUNK_BYTES } from "./constants.js";

const CURSOR_FILE_NAME = "cursor.txt";
const NEWLINE_BYTE = 0x0a;

const cursorFilePath = (dir: string): string => path.join(dir, CURSOR_FILE_NAME);
const historyFilePath = (dir: string): string => path.join(dir, HISTORY_FILE_NAME);

const fileSize = (filePath: string): number => {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
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

// temp + rename so a crash mid-write can't leave a truncated cursor. Tagged as
// JSON so a legacy bare-integer (line-index) cursor is distinguishable on read.
const writeGrabCursor = (dir: string, offset: number): void => {
  const target = cursorFilePath(dir);
  const tempPath = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ offset }));
  fs.renameSync(tempPath, target);
};

// Exact byte offset after `lineCount` newlines, scanned in bounded chunks so a
// huge legacy history neither materializes a >512 MB string nor clamps to a scan
// window (which would re-deliver or drop records on migration). `\n` (0x0A) never
// occurs inside a multi-byte UTF-8 sequence, so counting bytes is correct.
const byteOffsetAfterLines = (dir: string, lineCount: number): number => {
  const filePath = historyFilePath(dir);
  const size = fileSize(filePath);
  if (lineCount <= 0 || size === 0) return 0;
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.allocUnsafe(MIGRATION_SCAN_CHUNK_BYTES);
    let position = 0;
    let seen = 0;
    while (position < size) {
      const bytesRead = fs.readSync(fd, buffer, 0, MIGRATION_SCAN_CHUNK_BYTES, position);
      if (bytesRead <= 0) break;
      for (let index = 0; index < bytesRead; index += 1) {
        if (buffer[index] !== NEWLINE_BYTE) continue;
        seen += 1;
        if (seen === lineCount) return position + index + 1;
      }
      position += bytesRead;
    }
  } finally {
    fs.closeSync(fd);
  }
  // Fewer than lineCount complete lines exist; the legacy cursor consumed all of them.
  return size;
};

// Byte offset into history.jsonl (not a line index), so an idle poll can tell
// "nothing new" from the file size without reading.
export const readGrabCursor = (dir: string): number => {
  let raw: string;
  try {
    raw = fs.readFileSync(cursorFilePath(dir), "utf8").trim();
  } catch {
    return 0;
  }
  if (raw === "") return 0;
  let parsed: { offset?: unknown } | number;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (typeof parsed === "number") {
    // A bare integer is a legacy line-index cursor from before byte offsets.
    // Convert it to the byte position after that many lines (and persist) so
    // already-consumed grabs are not re-delivered after an upgrade.
    if (!Number.isInteger(parsed) || parsed < 0) return 0;
    const offset = byteOffsetAfterLines(dir, parsed);
    writeGrabCursor(dir, offset);
    return offset;
  }
  return typeof parsed.offset === "number" && Number.isInteger(parsed.offset) && parsed.offset >= 0
    ? parsed.offset
    : 0;
};

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
  maxAgeMs: number;
}

export const consumeGrabs = (dir: string, options: ConsumeGrabsOptions): string[] => {
  if (options.all) return readCompleteGrabLines(dir);

  const size = fileSize(historyFilePath(dir));
  const cursor = readGrabCursor(dir);
  // A cursor past EOF means the history was truncated/rotated under us; restart.
  const start = cursor > size ? 0 : cursor;
  if (start >= size) {
    // Persist the reset, or a later-grown file would be read from the stale offset.
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
      // Corrupt or partial line; skip it (the cursor still advances past it).
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
