import { describe, expect, it } from "vite-plus/test";
import { raceWithAbortSignal } from "../src/utils/race-with-abort-signal";

describe("raceWithAbortSignal", () => {
  it("passes the promise through when no signal is provided", async () => {
    expect(await raceWithAbortSignal(Promise.resolve(42), undefined)).toBe(42);
  });

  it("resolves with the promise value when the signal never aborts", async () => {
    const abortController = new AbortController();
    expect(await raceWithAbortSignal(Promise.resolve("value"), abortController.signal)).toBe(
      "value",
    );
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const abortController = new AbortController();
    abortController.abort();
    await expect(
      raceWithAbortSignal(new Promise<never>(() => {}), abortController.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects with the abort reason when aborted while pending", async () => {
    const abortController = new AbortController();
    const pendingCapture = raceWithAbortSignal(
      new Promise<never>(() => {}),
      abortController.signal,
    );
    abortController.abort(new Error("capture dismissed"));
    await expect(pendingCapture).rejects.toThrow("capture dismissed");
  });

  it("propagates rejection of the underlying promise", async () => {
    const abortController = new AbortController();
    await expect(
      raceWithAbortSignal(Promise.reject(new Error("decode failed")), abortController.signal),
    ).rejects.toThrow("decode failed");
  });
});
