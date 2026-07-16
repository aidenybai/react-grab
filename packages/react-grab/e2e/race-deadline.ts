export const DEADLINE_OUTCOME = Symbol("deadline");

export const raceDeadline = async <ResultType>(
  work: Promise<ResultType>,
  deadlineMs: number,
): Promise<ResultType | typeof DEADLINE_OUTCOME> => {
  let deadlineHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<typeof DEADLINE_OUTCOME>((resolveDeadline) => {
        deadlineHandle = setTimeout(() => resolveDeadline(DEADLINE_OUTCOME), deadlineMs);
      }),
    ]);
  } finally {
    if (deadlineHandle !== undefined) clearTimeout(deadlineHandle);
  }
};
