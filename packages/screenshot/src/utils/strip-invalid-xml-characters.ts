const INVALID_XML_CHARACTER_PATTERN = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\uFFFE\\uFFFF]" +
    "|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])" +
    "|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]",
  "g",
);

const INVALID_XML_CHARACTER_DETECTION_PATTERN = new RegExp(INVALID_XML_CHARACTER_PATTERN.source);

const LONE_SURROGATE_PATTERN = /[\uD800-\uDFFF]/;
const REPLACEMENT_CHARACTER = "�";

// Browsers paint lone surrogates as a visible U+FFFD glyph while C0 controls
// and U+FFFE/U+FFFF stay invisible, so surrogates must be substituted rather
// than removed to preserve text layout.
export const stripInvalidXmlCharacters = (value: string): string => {
  if (!INVALID_XML_CHARACTER_DETECTION_PATTERN.test(value)) return value;
  return value.replace(INVALID_XML_CHARACTER_PATTERN, (invalidCharacter) =>
    LONE_SURROGATE_PATTERN.test(invalidCharacter) ? REPLACEMENT_CHARACTER : "",
  );
};
