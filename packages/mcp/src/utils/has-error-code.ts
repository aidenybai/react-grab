export const hasErrorCode = (caughtError: unknown, expectedCode: string): boolean =>
  caughtError instanceof Error && "code" in caughtError && caughtError.code === expectedCode;
