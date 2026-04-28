import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { setupLogFileSink } from "../src/utils/setup-log-file-sink.js";
import { PROJECT_LOG_GITIGNORE_CONTENT, PROJECT_REACT_GRAB_DIR } from "../src/utils/constants.js";

let tempCwd: string;

beforeEach(() => {
  tempCwd = fs.mkdtempSync(path.join(os.tmpdir(), "setup-log-file-sink-"));
});

afterEach(() => {
  fs.rmSync(tempCwd, { recursive: true, force: true });
});

const writeAll = (sink: { append: (line: string) => void }, lines: string[]): void => {
  for (const line of lines) sink.append(line);
};

describe("setupLogFileSink", () => {
  it("creates the .react-grab directory, writes a gitignore that excludes the log file, and returns an append-able sink", () => {
    const setup = setupLogFileSink(tempCwd);
    expect(setup.outcome).toBe("ok");
    if (setup.outcome !== "ok") return;

    const dir = path.join(tempCwd, PROJECT_REACT_GRAB_DIR);
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.statSync(dir).isDirectory()).toBe(true);

    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf8")).toBe(
      PROJECT_LOG_GITIGNORE_CONTENT,
    );

    writeAll(setup.sink, [`{"content":"<a/>"}`, `{"content":"<b/>"}`]);
    const written = fs.readFileSync(setup.sink.path, "utf8");
    expect(written).toBe(`{"content":"<a/>"}\n{"content":"<b/>"}\n`);
  });

  it("does not overwrite an existing user-curated .gitignore", () => {
    const dir = path.join(tempCwd, PROJECT_REACT_GRAB_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const userContent = "# my own rules\nlogs\nfoo\n";
    fs.writeFileSync(path.join(dir, ".gitignore"), userContent, "utf8");

    const setup = setupLogFileSink(tempCwd);
    expect(setup.outcome).toBe("ok");

    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf8")).toBe(userContent);
  });

  it("does not duplicate content when an existing .gitignore already matches the expected content", () => {
    const dir = path.join(tempCwd, PROJECT_REACT_GRAB_DIR);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, ".gitignore"), PROJECT_LOG_GITIGNORE_CONTENT, "utf8");

    const setup = setupLogFileSink(tempCwd);
    expect(setup.outcome).toBe("ok");

    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf8")).toBe(
      PROJECT_LOG_GITIGNORE_CONTENT,
    );
  });

  it("appends to an existing log file across multiple setup calls (no truncation)", () => {
    const first = setupLogFileSink(tempCwd);
    expect(first.outcome).toBe("ok");
    if (first.outcome !== "ok") return;
    writeAll(first.sink, [`{"content":"<a/>"}`]);

    const second = setupLogFileSink(tempCwd);
    expect(second.outcome).toBe("ok");
    if (second.outcome !== "ok") return;
    writeAll(second.sink, [`{"content":"<b/>"}`]);

    const written = fs.readFileSync(second.sink.path, "utf8");
    expect(written).toBe(`{"content":"<a/>"}\n{"content":"<b/>"}\n`);
  });

  it("returns 'skipped' when the parent cwd is not a directory we can mkdir into", () => {
    // Pointing the sink at a path inside a regular file produces ENOTDIR,
    // which we treat as "skip the file mirror, keep streaming stdout".
    const blockingFile = path.join(tempCwd, "not-a-dir");
    fs.writeFileSync(blockingFile, "block");
    const setup = setupLogFileSink(blockingFile);
    expect(setup.outcome).toBe("skipped");
    if (setup.outcome !== "skipped") return;
    expect(setup.reason).toMatch(/ENOTDIR|not a directory|EEXIST/i);
  });
});
