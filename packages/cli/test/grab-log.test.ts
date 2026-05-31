import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { HISTORY_FILE_NAME } from "../src/utils/clipboard.js";
import { consumeGrabs, readCompleteGrabLines, readGrabCursor } from "../src/utils/grab-log.js";

let dir: string;

const historyPath = (): string => path.join(dir, HISTORY_FILE_NAME);
const cursorPath = (): string => path.join(dir, "cursor.txt");
const historySize = (): number => fs.statSync(historyPath()).size;
const appendRecord = (id: string): void =>
  fs.appendFileSync(historyPath(), `${JSON.stringify({ id })}\n`);
const record = (id: string): string => JSON.stringify({ id });
const appendAged = (id: string, ageMs: number): void =>
  fs.appendFileSync(historyPath(), `${JSON.stringify({ id, receivedAt: Date.now() - ageMs })}\n`);
const idsOf = (lines: string[]): string[] =>
  lines.map((line) => (JSON.parse(line) as { id: string }).id);

const consume = (overrides: { limit?: number; all?: boolean; maxAgeMs?: number } = {}): string[] =>
  consumeGrabs(dir, { limit: 0, all: false, maxAgeMs: 0, ...overrides });

const FIVE_MIN_MS = 5 * 60 * 1000;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "rg-grablog-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("readCompleteGrabLines", () => {
  it("returns [] when the history file is missing", () => {
    expect(readCompleteGrabLines(dir)).toEqual([]);
  });

  it("returns only newline-terminated records, skipping a partial final line", () => {
    fs.writeFileSync(historyPath(), `${record("1")}\n${record("2")}\n{"id":"par`);
    expect(readCompleteGrabLines(dir)).toEqual([record("1"), record("2")]);
  });

  it("returns [] when no line is terminated yet", () => {
    fs.writeFileSync(historyPath(), '{"id":"partial"');
    expect(readCompleteGrabLines(dir)).toEqual([]);
  });
});

describe("consumeGrabs cursor semantics", () => {
  it("delivers new records and advances the cursor to EOF", () => {
    appendRecord("1");
    appendRecord("2");
    expect(consume()).toEqual([record("1"), record("2")]);
    expect(readGrabCursor(dir)).toBe(historySize());
  });

  it("delivers each record exactly once across calls", () => {
    appendRecord("1");
    expect(consume()).toEqual([record("1")]);
    expect(consume()).toEqual([]);
    appendRecord("2");
    expect(consume()).toEqual([record("2")]);
  });

  it("caps output at the limit and drains the backlog across calls", () => {
    for (const id of ["1", "2", "3", "4", "5"]) appendRecord(id);
    expect(consume({ limit: 2 })).toEqual([record("1"), record("2")]);
    expect(consume({ limit: 2 })).toEqual([record("3"), record("4")]);
    expect(consume({ limit: 2 })).toEqual([record("5")]);
    expect(consume({ limit: 2 })).toEqual([]);
    expect(readGrabCursor(dir)).toBe(historySize());
  });

  it("does not deliver a partial final line until it is completed", () => {
    appendRecord("1");
    fs.appendFileSync(historyPath(), '{"id":"2"');
    expect(consume()).toEqual([record("1")]);
    fs.appendFileSync(historyPath(), "}\n");
    expect(consume()).toEqual([record("2")]);
  });

  it("skips a corrupt (unparseable) line but still advances past it", () => {
    fs.appendFileSync(historyPath(), "not json at all\n");
    appendRecord("ok");
    expect(consume()).toEqual([record("ok")]);
    expect(consume()).toEqual([]);
  });

  it("does not rewrite the cursor when there is nothing new", () => {
    appendRecord("1");
    consume();
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(cursorPath(), past, past);
    const mtimeBefore = fs.statSync(cursorPath()).mtimeMs;
    expect(consume()).toEqual([]);
    expect(fs.statSync(cursorPath()).mtimeMs).toBe(mtimeBefore);
  });

  it("recovers when the history is truncated/rotated under the cursor", () => {
    for (const id of ["1", "2", "3"]) appendRecord(id);
    consume();
    fs.writeFileSync(historyPath(), `${record("x")}\n`);
    expect(consume()).toEqual([record("x")]);
    expect(consume()).toEqual([]);
    appendRecord("y");
    expect(consume()).toEqual([record("y")]);
  });

  it("resets a stale cursor when the history is emptied, so later appends are not skipped", () => {
    appendRecord("1");
    consume();
    fs.writeFileSync(historyPath(), "");
    expect(consume()).toEqual([]);
    expect(readGrabCursor(dir)).toBe(0);
    appendRecord("2");
    expect(consume()).toEqual([record("2")]);
  });

  it("migrates a legacy line-index cursor to a byte offset without re-delivering or dropping", () => {
    appendRecord("1");
    appendRecord("2");
    appendRecord("3");
    fs.writeFileSync(cursorPath(), "2");
    expect(consume()).toEqual([record("3")]);
    expect(consume()).toEqual([]);
    appendRecord("4");
    expect(consume()).toEqual([record("4")]);
  });

  it("baselines at EOF when a legacy cursor counts more lines than exist (no re-delivery)", () => {
    appendRecord("1");
    appendRecord("2");
    fs.writeFileSync(cursorPath(), "5");
    expect(consume()).toEqual([]);
    appendRecord("3");
    expect(consume()).toEqual([record("3")]);
  });

  it("computes an exact migration offset across the chunk boundary on a large history", () => {
    const big = (id: string): string => JSON.stringify({ id, pad: "x".repeat(600 * 1024) });
    fs.writeFileSync(historyPath(), `${big("1")}\n${big("2")}\n${big("3")}\n`);
    expect(historySize()).toBeGreaterThan(1024 * 1024);
    fs.writeFileSync(cursorPath(), "2");
    expect(consume()).toEqual([big("3")]);
    expect(consume()).toEqual([]);
  });
});

describe("consumeGrabs eviction", () => {
  it("skips grabs older than maxAgeMs and advances the cursor past them", () => {
    appendAged("old", 10 * 60 * 1000);
    appendAged("new", 1000);
    expect(idsOf(consume({ maxAgeMs: FIVE_MIN_MS }))).toEqual(["new"]);
    expect(readGrabCursor(dir)).toBe(historySize());
    expect(consume({ maxAgeMs: FIVE_MIN_MS })).toEqual([]);
  });

  it("delivers grabs within maxAgeMs", () => {
    appendAged("a", 1000);
    appendAged("b", 2000);
    expect(idsOf(consume({ maxAgeMs: FIVE_MIN_MS }))).toEqual(["a", "b"]);
  });

  it("never evicts records without a receivedAt", () => {
    appendRecord("no-timestamp");
    expect(idsOf(consume({ maxAgeMs: 1 }))).toEqual(["no-timestamp"]);
  });

  it("maxAgeMs of 0 disables eviction", () => {
    appendAged("ancient", 60 * 60 * 1000);
    expect(idsOf(consume({ maxAgeMs: 0 }))).toEqual(["ancient"]);
  });

  it("evicted grabs do not count against the limit", () => {
    appendAged("old", 10 * 60 * 1000);
    appendAged("new1", 1000);
    appendAged("new2", 1000);
    expect(idsOf(consume({ limit: 2, maxAgeMs: FIVE_MIN_MS }))).toEqual(["new1", "new2"]);
  });
});

describe("consumeGrabs --all", () => {
  it("replays the entire history without advancing the cursor", () => {
    appendRecord("1");
    appendRecord("2");
    consume();
    const cursorAfterTwo = readGrabCursor(dir);
    appendRecord("3");
    expect(consume({ all: true })).toEqual([record("1"), record("2"), record("3")]);
    expect(readGrabCursor(dir)).toBe(cursorAfterTwo);
    expect(consume()).toEqual([record("3")]);
  });
});
