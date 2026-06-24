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

  it("aborts the task's signal when the timeout fires", async () => {
    let capturedSignal: AbortSignal | undefined;
    const result = runQueuedSourceFetch(
      (signal) => {
        capturedSignal = signal;
        return new Promise<string>(() => {});
      },
      "timed-out",
      TEST_TIMEOUT_MS,
    );

    expect(await result).toBe("timed-out");
    expect(capturedSignal?.aborted).toBe(true);
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

  it("returns the task's resolved value (not the fallback) when it settles in time", async () => {
    const result = await runQueuedSourceFetch(
      () => Promise.resolve("real-value"),
      "fallback",
      TEST_TIMEOUT_MS,
    );
    expect(result).toBe("real-value");
  });

  it("does not abort the signal when the task settles before the timeout", async () => {
    let capturedSignal: AbortSignal | undefined;
    await runQueuedSourceFetch(
      (signal) => {
        capturedSignal = signal;
        return Promise.resolve("done");
      },
      "fallback",
      TEST_TIMEOUT_MS,
    );
    expect(capturedSignal?.aborted).toBe(false);
  });

  it("admits queued tasks in FIFO order as slots free", async () => {
    const deferreds = Array.from({ length: 5 }, () => createDeferred<string>());
    const startOrder: number[] = [];

    deferreds.forEach((deferred, index) =>
      runQueuedSourceFetch(
        () => {
          startOrder.push(index);
          return deferred.promise;
        },
        "fallback",
        TEST_TIMEOUT_MS,
      ),
    );

    await flushMicrotasks();
    // Only the first three (the cap) have started.
    expect(startOrder).toEqual([0, 1, 2]);

    // Freeing slot 1 admits task 3; freeing slot 0 admits task 4 — in order.
    deferreds[1].resolve("done");
    await flushMicrotasks();
    expect(startOrder).toEqual([0, 1, 2, 3]);

    deferreds[0].resolve("done");
    await flushMicrotasks();
    expect(startOrder).toEqual([0, 1, 2, 3, 4]);

    for (const deferred of deferreds) deferred.resolve("done");
  });

  it("releases a slot when a task rejects, so the queue does not deadlock", async () => {
    const rejecting = Array.from({ length: 3 }, () => createDeferred<string>());
    const rejectingResults = rejecting.map((deferred) =>
      runQueuedSourceFetch(() => deferred.promise, "fallback", TEST_TIMEOUT_MS),
    );
    // Swallow the rejections at the call site (the queue re-throws them).
    rejectingResults.forEach((result) => result.catch(() => {}));

    let laterStarted = false;
    const laterResult = runQueuedSourceFetch(
      () => {
        laterStarted = true;
        return Promise.resolve("later");
      },
      "fallback",
      TEST_TIMEOUT_MS,
    );

    await flushMicrotasks();
    expect(laterStarted).toBe(false);

    // All three in-flight tasks reject; their slots must free for the queued task.
    for (const deferred of rejecting) deferred.reject(new Error("fetch failed"));

    expect(await laterResult).toBe("later");
    expect(laterStarted).toBe(true);
  });
});
