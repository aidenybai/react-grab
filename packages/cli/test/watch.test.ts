import { describe, expect, it, vi } from "vite-plus/test";
import { waitForNextGrab } from "../src/utils/wait-for-next-grab.js";
import type { ReadClipboardPayloadResult } from "../src/utils/read-clipboard-payload.js";
import type { ReactGrabPayload } from "../src/utils/parse-react-grab-payload.js";

const buildPayload = (timestamp: number): ReactGrabPayload => ({
  version: "0.1.32",
  content: "<button />",
  entries: [{ content: "<button />" }],
  timestamp,
});

const buildResult = (
  payload: ReactGrabPayload | null,
  overrides: Partial<ReadClipboardPayloadResult> = {},
): ReadClipboardPayloadResult => ({
  env: "macos",
  payload,
  recoverable: true,
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

describe("waitForNextGrab", () => {
  it("returns immediately when the very first read produces a different timestamp", async () => {
    const fresh = buildPayload(2000);
    const read = vi.fn().mockResolvedValue(buildResult(fresh));
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: 1000,
      timeoutMs: 5000,
      pollIntervalMs: 1,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("match");
    if (outcome.outcome === "match") {
      expect(outcome.payload.timestamp).toBe(2000);
    }
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("does not match when the clipboard still holds the snapshot timestamp", async () => {
    const stale = buildPayload(1000);
    const fresh = buildPayload(1500);
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValueOnce(buildResult(stale))
      .mockResolvedValueOnce(buildResult(stale))
      .mockResolvedValueOnce(buildResult(fresh));
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: 1000,
      timeoutMs: 5000,
      pollIntervalMs: 1,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("match");
    if (outcome.outcome === "match") {
      expect(outcome.payload.timestamp).toBe(1500);
    }
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("treats a null initial timestamp as 'any payload counts as fresh'", async () => {
    const fresh = buildPayload(42);
    const read = vi.fn().mockResolvedValue(buildResult(fresh));
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: null,
      timeoutMs: 5000,
      pollIntervalMs: 1,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("match");
  });

  it("keeps polling when the clipboard has no payload", async () => {
    const fresh = buildPayload(2000);
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValueOnce(buildResult(null))
      .mockResolvedValueOnce(buildResult(null))
      .mockResolvedValueOnce(buildResult(fresh));
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: null,
      timeoutMs: 5000,
      pollIntervalMs: 1,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("match");
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("returns timeout when no fresh payload arrives within the deadline", async () => {
    const stale = buildPayload(1000);
    const read = vi.fn().mockResolvedValue(buildResult(stale));
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: 1000,
      timeoutMs: 50,
      pollIntervalMs: 5,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("timeout");
    expect(read.mock.calls.length).toBeGreaterThan(0);
  });

  it("blocks forever when timeoutMs is 0 (until match or abort)", async () => {
    const fresh = buildPayload(2000);
    const read = vi
      .fn<() => Promise<ReadClipboardPayloadResult>>()
      .mockResolvedValue(buildResult(null))
      .mockResolvedValueOnce(buildResult(null))
      .mockResolvedValueOnce(buildResult(null))
      .mockResolvedValueOnce(buildResult(null))
      .mockResolvedValueOnce(buildResult(fresh));
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: null,
      timeoutMs: 0,
      pollIntervalMs: 60_000_000,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("match");
  });

  it("returns 'unrecoverable' immediately when the env cannot produce a payload", async () => {
    const sshHint = "Clipboard channel is unavailable in SSH sessions.";
    const read = vi.fn().mockResolvedValue({
      env: "ssh",
      payload: null,
      hint: sshHint,
      recoverable: false,
    });
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: null,
      timeoutMs: 5000,
      pollIntervalMs: 5,
      read,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("unrecoverable");
    if (outcome.outcome === "unrecoverable") {
      expect(outcome.result.env).toBe("ssh");
      expect(outcome.result.hint).toBe(sshHint);
    }
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("respects a pre-aborted signal without invoking the reader", async () => {
    const stale = buildPayload(1000);
    const read = vi.fn().mockResolvedValue(buildResult(stale));
    const controller = new AbortController();
    controller.abort();
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: 1000,
      timeoutMs: 5000,
      pollIntervalMs: 5,
      read,
      signal: controller.signal,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("aborted");
    expect(read).not.toHaveBeenCalled();
  });

  it("respects a mid-flight abort triggered by the reader itself", async () => {
    const stale = buildPayload(1000);
    const controller = new AbortController();
    let callCount = 0;
    const read = vi.fn(async (): Promise<ReadClipboardPayloadResult> => {
      callCount += 1;
      if (callCount === 3) controller.abort();
      return buildResult(stale);
    });
    const clock = createFakeClock();

    const outcome = await waitForNextGrab({
      initialTimestamp: 1000,
      timeoutMs: 0,
      pollIntervalMs: 1,
      read,
      signal: controller.signal,
      getCurrentMs: clock.getCurrentMs,
      sleepMs: clock.sleepMs,
    });

    expect(outcome.outcome).toBe("aborted");
    expect(callCount).toBe(3);
  });
});
