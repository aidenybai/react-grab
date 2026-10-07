export const ABORTED_PROMISE_RESULT = Symbol("aborted-promise-result");

export const racePromiseWithAbort = async <Result>(
  promise: Promise<Result>,
  signal?: AbortSignal,
): Promise<Result | typeof ABORTED_PROMISE_RESULT> => {
  if (!signal) return promise;
  if (signal.aborted) return ABORTED_PROMISE_RESULT;

  let resolveAbort = (): void => {};
  const aborted = new Promise<typeof ABORTED_PROMISE_RESULT>((resolve) => {
    resolveAbort = () => resolve(ABORTED_PROMISE_RESULT);
  });
  signal.addEventListener("abort", resolveAbort, { once: true });

  try {
    return await Promise.race([promise, aborted]);
  } finally {
    signal.removeEventListener("abort", resolveAbort);
  }
};
