const NUMERIC_QUERY_PATTERN = /^-?\d*\.?\d+(?:[a-z%]+)?$/i;

export const isNumericQuery = (query: string): boolean => NUMERIC_QUERY_PATTERN.test(query);
