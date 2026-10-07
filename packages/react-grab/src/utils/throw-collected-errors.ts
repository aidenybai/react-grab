export const throwCollectedErrors = (errors: unknown[], message: string): void => {
  if (errors.length === 0) return;
  if (errors.length === 1) throw errors[0];
  throw new AggregateError(errors, message);
};
