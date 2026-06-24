import { describe, expect, it } from "vite-plus/test";
import { runQueuedSourceFetch } from "../src/utils/source-fetch-queue.js";

const TEST_TIMEOUT_MS = 25;

// A promise whose resolve/reject are exposed so a test can settle it on demand.
const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn;
    reject = rejectFn;
  });
  return { promise, resolve, reject };
};

// Yields long enough for the queue's pending microtasks (slot handoff, task
// start) to settle before a test inspects them.
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("runQueuedSourceFetch", () => {
  it("runs at most three fetches concurrently and admits the next as one settles", async () => {
    const deferreds = Array.from({ length: 4 }, () => createDeferred<string>());
    let startedCount = 0;

    const results = deferreds.map((deferred) =>
      runQueuedSourceFetch(
        () => {
          startedCount += 1;
          return deferred.promise;
        },
        "fallback",
        TEST_TIMEOUT_MS,
      ),
    );

    // The cap is three, so the fourth task stays queued while three are in
    // flight.
    await flushMicrotasks();
    expect(startedCount).toBe(3);

    // Settling one in-flight fetch frees its slot for the queued fourth.
    deferreds[0].resolve("first");
    await flushMicrotasks();
    expect(startedCount).toBe(4);

    for (const deferred of deferreds) deferred.resolve("done");
    expect(await Promise.all(results)).toEqual(["first", "done", "done", "done"]);
  });

  it("returns the fallback when a fetch outlives the timeout, without hanging", async () => {
    const neverSettles = createDeferred<string>();
    const result = runQueuedSourceFetch(() => neverSettles.promise, "timed-out", TEST_TIMEOUT_MS);
    expect(await result).toBe("timed-out");
  });

  it("frees the timed-out fetch's slot so later fetches still run", async () => {
    const stuck = createDeferred<string>();
    // Fill all three slots with fetches that never settle on their own.
    const stuckResults = Array.from({ length: 3 }, () =>
      runQueuedSourceFetch(() => stuck.promise, "stuck-fallback", TEST_TIMEOUT_MS),
    );

    let laterStarted = false;
    const laterResult = runQueuedSourceFetch(
      () => {
        laterStarted = true;
        return Promise.resolve("later");
      },
      "later-fallback",
      TEST_TIMEOUT_MS,
    );

    await flushMicrotasks();
    expect(laterStarted).toBe(false);

    // Once the three stuck fetches time out, their slots free and the queued
    // fetch runs.
    expect(await Promise.all(stuckResults)).toEqual([
      "stuck-fallback",
      "stuck-fallback",
      "stuck-fallback",
    ]);
    expect(await laterResult).toBe("later");
    expect(laterStarted).toBe(true);
  });

  it("does not surface a late rejection from a fetch that already timed out", async () => {
    const rejectsLate = createDeferred<string>();
    rejectsLate.promise.catch(() => {});

    const result = runQueuedSourceFetch(() => rejectsLate.promise, "fallback", TEST_TIMEOUT_MS);
    expect(await result).toBe("fallback");

    // The orphaned fetch rejecting after the timeout race must not throw.
    rejectsLate.reject(new Error("connection reset"));
    await wait(TEST_TIMEOUT_MS);
    expect(await result).toBe("fallback");
  });
});
