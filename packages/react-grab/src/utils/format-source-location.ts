const SOURCE_FILE_EXTENSION_PATTERN = /\.(tsx?|jsx?)$/i;
const BUNDLED_FILENAME_PATTERN = /[_]{2,}|[0-9a-f]{8,}/i;

export const formatSourceLocation = (
  filePath: string | null,
  lineNumber: number | null,
): string => {
  if (!filePath) return "";

  const fileName = filePath.split(/[/\\]/).pop() ?? "";
  if (!fileName) return "";

  const isBundledFile =
    !SOURCE_FILE_EXTENSION_PATTERN.test(fileName) ||
    BUNDLED_FILENAME_PATTERN.test(fileName);
  if (isBundledFile) return "";

  return lineNumber ? `${fileName}:${lineNumber}` : fileName;
};
