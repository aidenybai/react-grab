import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { HISTORY_FILE_NAME } from "../src/utils/clipboard.js";
import { consumeGrabs, readCompleteGrabLines, readGrabCursor } from "../src/utils/grab-log.js";

let dir: string;

const historyPath = (): string => path.join(dir, HISTORY_FILE_NAME);
const cursorPath = (): string => path.join(dir, "cursor.txt");
const appendRecord = (id: string): void =>
  fs.appendFileSync(historyPath(), `${JSON.stringify({ id })}\n`);
const record = (id: string): string => JSON.stringify({ id });

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
  it("delivers new records and advances the cursor past them", () => {
    appendRecord("1");
    appendRecord("2");
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("1"), record("2")]);
    expect(readGrabCursor(dir)).toBe(2);
  });

  it("delivers each record exactly once across calls", () => {
    appendRecord("1");
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("1")]);
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([]);
    appendRecord("2");
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("2")]);
  });

  it("caps output at the limit and drains the backlog across calls", () => {
    for (const id of ["1", "2", "3", "4", "5"]) appendRecord(id);
    expect(consumeGrabs(dir, { limit: 2, all: false })).toEqual([record("1"), record("2")]);
    expect(consumeGrabs(dir, { limit: 2, all: false })).toEqual([record("3"), record("4")]);
    expect(consumeGrabs(dir, { limit: 2, all: false })).toEqual([record("5")]);
    expect(consumeGrabs(dir, { limit: 2, all: false })).toEqual([]);
    expect(readGrabCursor(dir)).toBe(5);
  });

  it("does not deliver a partial final line until it is completed", () => {
    appendRecord("1");
    fs.appendFileSync(historyPath(), '{"id":"2"');
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("1")]);
    fs.appendFileSync(historyPath(), "}\n");
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("2")]);
  });

  it("does not rewrite the cursor when there is nothing new", () => {
    appendRecord("1");
    consumeGrabs(dir, { limit: 0, all: false });
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(cursorPath(), past, past);
    const mtimeBefore = fs.statSync(cursorPath()).mtimeMs;
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([]);
    expect(fs.statSync(cursorPath()).mtimeMs).toBe(mtimeBefore);
  });

  it("recovers when the history is truncated below the cursor", () => {
    for (const id of ["1", "2", "3"]) appendRecord(id);
    consumeGrabs(dir, { limit: 0, all: false });
    fs.writeFileSync(historyPath(), `${record("x")}\n`);
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([]);
    expect(readGrabCursor(dir)).toBe(1);
    appendRecord("y");
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("y")]);
  });
});

describe("consumeGrabs --all", () => {
  it("replays the entire history without advancing the cursor", () => {
    appendRecord("1");
    appendRecord("2");
    consumeGrabs(dir, { limit: 0, all: false });
    appendRecord("3");
    expect(consumeGrabs(dir, { limit: 0, all: true })).toEqual([
      record("1"),
      record("2"),
      record("3"),
    ]);
    expect(readGrabCursor(dir)).toBe(2);
    expect(consumeGrabs(dir, { limit: 0, all: false })).toEqual([record("3")]);
  });
});
