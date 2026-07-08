export const raceWithAbortSignal = async <Value>(
  promise: Promise<Value>,
  abortSignal: AbortSignal | undefined,
): Promise<Value> => {
  if (!abortSignal) return promise;
  abortSignal.throwIfAborted();
  let removeAbortListener: (() => void) | undefined;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    const handleAbort = (): void => reject(abortSignal.reason);
    abortSignal.addEventListener("abort", handleAbort, { once: true });
    removeAbortListener = (): void => abortSignal.removeEventListener("abort", handleAbort);
  });
  try {
    return await Promise.race([promise, abortPromise]);
  } finally {
    removeAbortListener?.();
  }
};
