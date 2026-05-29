const NUMERIC_DRAFT_QUERY_PATTERN = /^-?(?:\d+\.?|\d*\.\d*)?$/;

export const isNumericDraftQuery = (query: string): boolean =>
  NUMERIC_DRAFT_QUERY_PATTERN.test(query);
