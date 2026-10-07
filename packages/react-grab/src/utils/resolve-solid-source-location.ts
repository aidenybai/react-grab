import type { SourceLocation } from "../types.js";

export const SOLID_SOURCE_LOCATION_ATTRIBUTE = "data-react-grab-source-location";

const SOURCE_LOCATION_DELIMITER = ":";

export const resolveSolidSourceLocation = (element: Element): SourceLocation | null => {
  const location = element
    .closest(`[${SOLID_SOURCE_LOCATION_ATTRIBUTE}]`)
    ?.getAttribute(SOLID_SOURCE_LOCATION_ATTRIBUTE);
  if (!location) return null;

  const columnDelimiterIndex = location.lastIndexOf(SOURCE_LOCATION_DELIMITER);
  if (columnDelimiterIndex === -1) return null;

  const lineDelimiterIndex = location.lastIndexOf(
    SOURCE_LOCATION_DELIMITER,
    columnDelimiterIndex - 1,
  );
  if (lineDelimiterIndex === -1) return null;

  const filePath = location.slice(0, lineDelimiterIndex);
  const lineNumber = Number(location.slice(lineDelimiterIndex + 1, columnDelimiterIndex));
  const columnNumber = Number(location.slice(columnDelimiterIndex + 1));
  if (!filePath || !Number.isInteger(lineNumber) || !Number.isInteger(columnNumber)) return null;

  return {
    filePath,
    lineNumber,
    columnNumber,
    componentName: null,
  };
};
