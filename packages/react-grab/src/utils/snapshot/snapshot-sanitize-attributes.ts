const FRAMEWORK_DIRECTIVE_PATTERNS = [
  /^v-/,
  /^x-/,
  /^:/,
  /^on:/,
  /^bind:/,
  /^let:/,
  /^class:/,
  /^use:/,
  /^transition:/,
  /^animate:/,
  /^in:/,
  /^out:/,
];

const ALLOWED_COLON_PREFIXES = new Set(["xml", "xlink"]);

export const isFrameworkDirectiveAttribute = (attributeName: string): boolean => {
  if (attributeName.includes("@")) return true;

  if (attributeName.includes(":")) {
    const colonPrefix = attributeName.split(":", 1)[0];
    if (!ALLOWED_COLON_PREFIXES.has(colonPrefix)) return true;
  }

  for (const pattern of FRAMEWORK_DIRECTIVE_PATTERNS) {
    if (pattern.test(attributeName)) return true;
  }

  return false;
};

export const sanitizeSerializedAttributes = (
  attributePairs: Array<[string, string]>,
): Array<[string, string]> =>
  attributePairs.filter(([attributeName]) => !isFrameworkDirectiveAttribute(attributeName));
