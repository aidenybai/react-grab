import { describe, expect, it, vi } from "vite-plus/test";
import type { ReadClipboardPayloadResult } from "../src/utils/read-clipboard-payload.js";
import type { ReactGrabPayload } from "../src/utils/parse-react-grab-payload.js";
import { runLogLoop } from "../src/utils/run-log-loop.js";

const buildPayload = (
  timestamp: number,
  overrides: Partial<ReactGrabPayload> = {},
): ReactGrabPayload => ({
  version: "0.1.32",
  content: "<button />",
  entries: [{ content: "<button />" }],
  timestamp,
  ...overrides,
});

const buildResult = (
  payload: ReactGrabPayload | null,
  overrides: Partial<ReadClipboardPayloadResult> = {},
): ReadClipboardPayloadResult => ({
  env: "macos",
  payload,
  recoverable: true,
  rawPayloadPresent: payload !== null,
  ...overrides,
});

interface FakeClock {
  getCurrentMs: () => number;
  sleepMs: (durationMs: number) => Promise<void>;
}

const createFakeClock = (): FakeClock => {
  let currentMs = 0;
  return {
    getCurrentMs: () => currentMs,
    sleepMs: (durationMs: number) => {
      currentMs += durationMs;
      return Promise.resolve();
    },
  };
};

describe("runLogLoop", () => {
  it("emits one NDJSON line per match and advances the baseline so the same grab is not re-emitted", async () => {
    const grabA = buildPayload(2000, {
      content: "<button>A</button>",
      entries: [{ content: "<button>A</button>" }],
    });
    const grabB = buildPayload(3000, {
      content: "<button>B</button>",
      entries: [{ content: "<button>B</button>" }],
    });
    const grabC = buildPayload(4000, {
      content: "<button>C</button>",
      entries: [{ content: "<button>C</button>" }],
    });
    // SSH-style unrecoverable read after three matches forces the loop to
    // exit so the test terminates deterministically.
    const stop: ReadClipboardPayloadResult = {
      env: "ssh",
      payload: null,
      hint: "SSH detected",
      recoverable: false,
      rawPayloadPresent: false,
    };
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValueOnce(buildResult(grabA))
      .mockResolvedValueOnce(buildResult(grabB))
      .mockResolvedValueOnce(buildResult(grabC))
      .mockResolvedValue(stop);
    const writes: string[] = [];
    const clock = createFakeClock();

    const result = await runLogLoop({
      initialResult: buildResult(null),
      read,
      write: (line) => writes.push(line),
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(result.outcome).toBe("fail");
    if (result.outcome !== "fail") return;
    expect(result.exitCode).toBe(2);
    expect(result.message).toBe("SSH detected");
    expect(writes).toHaveLength(3);
    expect(JSON.parse(writes[0])).toEqual({ content: "<button>A</button>" });
    expect(JSON.parse(writes[1])).toEqual({ content: "<button>B</button>" });
    expect(JSON.parse(writes[2])).toEqual({ content: "<button>C</button>" });
  });

  it("includes prompt when the user typed one in the toolbar", async () => {
    const grab = buildPayload(2000, {
      content: "Refactor\n\n<button />",
      entries: [{ content: "<button />", commentText: "Refactor" }],
    });
    const stop: ReadClipboardPayloadResult = {
      env: "ssh",
      payload: null,
      hint: "SSH detected",
      recoverable: false,
      rawPayloadPresent: false,
    };
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValueOnce(buildResult(grab))
      .mockResolvedValue(stop);
    const writes: string[] = [];
    const clock = createFakeClock();

    const result = await runLogLoop({
      initialResult: buildResult(null),
      read,
      write: (line) => writes.push(line),
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(result.outcome).toBe("fail");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0])).toEqual({
      prompt: "Refactor",
      content: "<button />",
    });
  });

  it("returns 'unrecoverable' immediately when the initial read is not recoverable", async () => {
    const read = vi.fn<() => Promise<ReadClipboardPayloadResult>>();
    const writes: string[] = [];
    const initialResult: ReadClipboardPayloadResult = {
      env: "ssh",
      payload: null,
      hint: "Run on the same machine as your browser.",
      recoverable: false,
      rawPayloadPresent: false,
    };

    const result = await runLogLoop({
      initialResult,
      read,
      write: (line) => writes.push(line),
    });

    expect(result.outcome).toBe("fail");
    if (result.outcome !== "fail") return;
    expect(result.exitCode).toBe(2);
    expect(result.message).toBe("Run on the same machine as your browser.");
    expect(writes).toHaveLength(0);
    expect(read).not.toHaveBeenCalled();
  });

  it("mirrors each emitted line to the appendToFile sink when provided", async () => {
    const grabA = buildPayload(2000, {
      content: "<a />",
      entries: [{ content: "<a />" }],
    });
    const grabB = buildPayload(3000, {
      content: "<b />",
      entries: [{ content: "<b />" }],
    });
    const stop: ReadClipboardPayloadResult = {
      env: "ssh",
      payload: null,
      hint: "SSH detected",
      recoverable: false,
      rawPayloadPresent: false,
    };
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValueOnce(buildResult(grabA))
      .mockResolvedValueOnce(buildResult(grabB))
      .mockResolvedValue(stop);
    const stdoutWrites: string[] = [];
    const fileWrites: string[] = [];
    const clock = createFakeClock();

    await runLogLoop({
      initialResult: buildResult(null),
      read,
      write: (line) => stdoutWrites.push(line),
      appendToFile: (line) => fileWrites.push(line),
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(stdoutWrites).toEqual(fileWrites);
    expect(stdoutWrites).toHaveLength(2);
    expect(JSON.parse(stdoutWrites[0])).toEqual({ content: "<a />" });
    expect(JSON.parse(stdoutWrites[1])).toEqual({ content: "<b />" });
  });

  it("returns 'ok' after the first match when exitOnFirstMatch is true", async () => {
    const grab = buildPayload(2000, {
      content: "<button>A</button>",
      entries: [{ content: "<button>A</button>" }],
    });
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValue(buildResult(grab));
    const writes: string[] = [];
    const fileWrites: string[] = [];
    const clock = createFakeClock();

    const result = await runLogLoop({
      initialResult: buildResult(null),
      read,
      write: (line) => writes.push(line),
      appendToFile: (line) => fileWrites.push(line),
      exitOnFirstMatch: true,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(result.outcome).toBe("ok");
    expect(writes).toHaveLength(1);
    expect(fileWrites).toHaveLength(1);
    expect(JSON.parse(writes[0])).toEqual({ content: "<button>A</button>" });
    // Should not have polled again - one read, one match, then exit ok.
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("respects an abort signal between iterations", async () => {
    const grab = buildPayload(2000);
    const controller = new AbortController();
    const read = vi.fn(async (): Promise<ReadClipboardPayloadResult> => {
      controller.abort();
      return buildResult(grab);
    });
    const writes: string[] = [];
    const clock = createFakeClock();

    const result = await runLogLoop({
      initialResult: buildResult(null),
      read,
      write: (line) => writes.push(line),
      signal: controller.signal,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(result.outcome).toBe("fail");
    if (result.outcome !== "fail") return;
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("Aborted");
  });
});
