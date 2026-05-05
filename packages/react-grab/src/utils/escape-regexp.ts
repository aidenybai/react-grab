const REGEXP_SPECIAL_CHARS_PATTERN = /[.*+?^${}()|[\]\\]/g;

export const escapeRegExp = (input: string): string =>
  input.replace(REGEXP_SPECIAL_CHARS_PATTERN, "\\$&");
