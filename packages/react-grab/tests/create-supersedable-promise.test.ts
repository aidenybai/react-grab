import { describe, expect, it } from "vite-plus/test";
import { createSupersedablePromise } from "../src/utils/create-supersedable-promise.js";

interface PendingResult<Result> {
  promise: Promise<Result>;
  resolve: (result: Result) => void;
}

const createPendingResult = <Result>(): PendingResult<Result> => {
  let resolveResult = (_result: Result): void => {};
  const promise = new Promise<Result>((resolve) => {
    resolveResult = resolve;
  });
  return { promise, resolve: resolveResult };
};

describe("createSupersedablePromise", () => {
  it("keeps the initial result when it is not superseded", async () => {
    const result = createSupersedablePromise(Promise.resolve("initial"));

    await expect(result.promise).resolves.toBe("initial");
  });

  it("forwards pending waiters to the replacement promise", async () => {
    const initialResult = createPendingResult<string | null>();
    const result = createSupersedablePromise(initialResult.promise);

    result.supersedeWith(Promise.resolve("replacement"));
    initialResult.resolve(null);

    await expect(result.promise).resolves.toBe("replacement");
  });

  it("forwards through repeated supersessions", async () => {
    const firstResult = createPendingResult<string | null>();
    const secondResult = createPendingResult<string | null>();
    const first = createSupersedablePromise(firstResult.promise);
    const second = createSupersedablePromise(secondResult.promise);

    first.supersedeWith(second.promise);
    second.supersedeWith(Promise.resolve("latest"));
    firstResult.resolve(null);
    secondResult.resolve(null);

    await expect(first.promise).resolves.toBe("latest");
  });
});
