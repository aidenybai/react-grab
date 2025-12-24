const FORBIDDEN_PATTERNS = [
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bdocument\.cookie\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
];

const sanitizeCode = (code: string): string =>
  code
    .replace(/[\u2018\u2019\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u2033\u2036]/g, '"')
    .replace(/[\u2014\u2013\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedCode: string;
}

export const validateCode = (code: string): ValidationResult => {
  const sanitizedCode = sanitizeCode(code);
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function("$el", sanitizedCode);
  } catch (err) {
    return {
      isValid: false,
      error: `Invalid JavaScript syntax${err instanceof Error ? `: ${err.message}` : ""}`,
      sanitizedCode,
    };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sanitizedCode)) {
      return {
        isValid: false,
        error: `Potentially unsafe code detected: ${pattern.source}`,
        sanitizedCode,
      };
    }
  }

  return { isValid: true, sanitizedCode };
};
