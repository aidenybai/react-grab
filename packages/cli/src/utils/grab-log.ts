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

const grabReceivedAt = (line: string): number | null => {
  try {
    const value = (JSON.parse(line) as { receivedAt?: unknown }).receivedAt;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
};

interface ConsumeGrabsOptions {
  limit: number;
  all: boolean;
  // Grabs captured longer ago than this are stale and skipped (cursor still
  // advances past them). 0 disables eviction. Records without a parseable
  // receivedAt are never evicted.
  maxAgeMs?: number;
}

// Advances the cursor only past what it examines, so a backlog drains across
// calls without dropping any and stale grabs are evicted rather than delivered.
// `all` replays everything without touching the cursor. Rewriting the cursor only
// when it moves also self-heals one left past the end by a truncated history.
export const consumeGrabs = (dir: string, options: ConsumeGrabsOptions): string[] => {
  const lines = readCompleteGrabLines(dir);
  if (options.all) return lines;
  const maxAgeMs = options.maxAgeMs ?? 0;
  const cursor = readGrabCursor(dir);
  const total = lines.length;
  const now = Date.now();
  const fresh: string[] = [];
  let index = Math.min(cursor, total);
  while (index < total && (options.limit <= 0 || fresh.length < options.limit)) {
    const line = lines[index];
    index += 1;
    if (maxAgeMs > 0) {
      const receivedAt = grabReceivedAt(line);
      if (receivedAt !== null && now - receivedAt > maxAgeMs) continue;
    }
    fresh.push(line);
  }
  if (index !== cursor) fs.writeFileSync(cursorFilePath(dir), String(index));
  return fresh;
};
