export const normalizeErrorMessage = (
  error: unknown,
  fallback = "Unknown error",
): string =>
  error instanceof Error && error.message ? error.message : fallback;

export const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));
