interface ParsedSourceLocation {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
}

const SOURCE_DELIMITER = ":";

const parsePositiveInteger = (value: string): number | null => {
  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) return null;
  if (parsedValue < 0) return null;
  return parsedValue;
};

export const parseSourceLocation = (
  location: string,
): ParsedSourceLocation | null => {
  const lastDelimiterIndex = location.lastIndexOf(SOURCE_DELIMITER);
  if (lastDelimiterIndex === -1) return null;

  const secondLastDelimiterIndex = location.lastIndexOf(
    SOURCE_DELIMITER,
    lastDelimiterIndex - 1,
  );
  if (secondLastDelimiterIndex === -1) return null;

  const filePath = location.slice(0, secondLastDelimiterIndex);
  if (!filePath) return null;

  const lineValue = location.slice(
    secondLastDelimiterIndex + 1,
    lastDelimiterIndex,
  );
  const columnValue = location.slice(lastDelimiterIndex + 1);

  const lineNumber = parsePositiveInteger(lineValue);
  const columnNumber = parsePositiveInteger(columnValue);
  if (lineNumber === null || columnNumber === null) return null;

  return {
    filePath,
    lineNumber,
    columnNumber,
  };
};
