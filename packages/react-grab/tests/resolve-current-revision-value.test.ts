import { describe, expect, it } from "vite-plus/test";
import { resolveCurrentRevisionValue } from "../src/utils/resolve-current-revision-value.js";

describe("resolveCurrentRevisionValue", () => {
  it("returns the first value when its revision remains current", async () => {
    let attemptCount = 0;

    const value = await resolveCurrentRevisionValue(
      () => {
        attemptCount += 1;
        return {
          isCurrent: () => true,
          valuePromise: Promise.resolve("current"),
        };
      },
      () => "fallback",
    );

    expect(value).toBe("current");
    expect(attemptCount).toBe(1);
  });

  it("retries when the revision changes during resolution", async () => {
    let attemptCount = 0;
    let currentRevision = 1;

    const value = await resolveCurrentRevisionValue(
      () => {
        attemptCount += 1;
        const resolvedRevision = currentRevision;
        return {
          isCurrent: () => currentRevision === resolvedRevision,
          valuePromise: Promise.resolve().then(() => {
            if (attemptCount === 1) {
              currentRevision += 1;
              return "stale";
            }
            return "updated";
          }),
        };
      },
      () => "fallback",
    );

    expect(value).toBe("updated");
    expect(attemptCount).toBe(2);
  });

  it("returns the latest coherent value when revisions keep changing", async () => {
    let attemptCount = 0;

    const value = await resolveCurrentRevisionValue(
      () => {
        attemptCount += 1;
        return {
          isCurrent: () => false,
          valuePromise: Promise.resolve(`revision-${attemptCount}`),
        };
      },
      () => "fallback",
    );

    expect(value).toBe("revision-2");
    expect(attemptCount).toBe(2);
  });

  it("returns the fallback when no revision is available", async () => {
    await expect(
      resolveCurrentRevisionValue(
        () => null,
        () => "fallback",
      ),
    ).resolves.toBe("fallback");
  });

  it("creates the fallback after a stale revision disappears", async () => {
    let isRevisionAvailable = true;
    let fallbackCreationCount = 0;

    const value = await resolveCurrentRevisionValue(
      () => {
        if (!isRevisionAvailable) return null;
        return {
          isCurrent: () => false,
          valuePromise: Promise.resolve().then(() => {
            isRevisionAvailable = false;
            return "stale";
          }),
        };
      },
      () => {
        fallbackCreationCount += 1;
        return "fallback";
      },
    );

    expect(value).toBe("fallback");
    expect(fallbackCreationCount).toBe(1);
  });
});
