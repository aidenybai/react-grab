import { describe, expect, it } from "vite-plus/test";
import { runExecFile, type ExecFileFailure } from "../src/utils/run-exec-file.js";

const isWindows = process.platform === "win32";
const echoCommand = isWindows ? "cmd" : "node";
const echoArgs = isWindows
  ? ["/c", "echo hello"]
  : ["-e", "process.stdout.write('hello'); process.stderr.write('warn');"];
const failArgs = isWindows
  ? ["/c", "echo nope 1>&2 && exit 2"]
  : ["-e", "process.stderr.write('nope'); process.exit(2);"];

describe("runExecFile", () => {
  it("resolves with stdout and stderr on exit 0", async () => {
    const result = await runExecFile(echoCommand, echoArgs, {});
    expect(result.stdout.trim()).toBe("hello");
    if (!isWindows) {
      expect(result.stderr.trim()).toBe("warn");
    }
  });

  it("rejects with stderr attached when the child exits non-zero", async () => {
    let caught: ExecFileFailure | null = null;
    try {
      await runExecFile(echoCommand, failArgs, {});
    } catch (caughtError) {
      caught = caughtError as ExecFileFailure;
    }
    expect(caught).not.toBeNull();
    expect(caught?.stderr ?? "").toContain("nope");
  });

  it("rejects with ENOENT when the binary does not exist", async () => {
    let caught: NodeJS.ErrnoException | null = null;
    try {
      await runExecFile("definitely-not-a-real-binary-xyz", [], {});
    } catch (caughtError) {
      caught = caughtError as NodeJS.ErrnoException;
    }
    expect(caught?.code).toBe("ENOENT");
  });
});
