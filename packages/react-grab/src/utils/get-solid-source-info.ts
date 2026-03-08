import type { ElementSourceInfo } from "../types.js";
import { parseSourceLocation } from "./parse-source-location.js";

interface LocatorExpressionStart {
  lineNumber: number;
  columnNumber: number;
}

const LOCATOR_ID_SEPARATOR = "::";
const LOCATOR_PATH_ATTRIBUTE_NAME = "data-locatorjs";
const LOCATOR_ID_ATTRIBUTE_NAME = "data-locatorjs-id";
const SOLID_DEVTOOLS_LOCATION_ATTRIBUTE_NAME = "data-source-loc";
const SOLID_DEVTOOLS_PROJECT_PATH_GLOBAL_NAME = "$sdt_projectPath";
const LOCATOR_DATA_GLOBAL_NAME = "__LOCATOR_DATA__";
const ABSOLUTE_UNIX_PREFIX = "/";
const RELATIVE_CURRENT_PREFIX = "./";
const ABSOLUTE_WINDOWS_PATTERN = /^[a-zA-Z]:\\/;
const LOCATOR_ATTRIBUTE_SELECTOR = `[${LOCATOR_PATH_ATTRIBUTE_NAME}], [${LOCATOR_ID_ATTRIBUTE_NAME}], [${SOLID_DEVTOOLS_LOCATION_ATTRIBUTE_NAME}]`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const isAbsoluteFilePath = (filePath: string): boolean =>
  filePath.startsWith(ABSOLUTE_UNIX_PREFIX) ||
  ABSOLUTE_WINDOWS_PATTERN.test(filePath);

const normalizeSolidDevtoolsFilePath = (filePath: string): string => {
  if (typeof window === "undefined") return filePath;
  if (isAbsoluteFilePath(filePath)) return filePath;

  const projectPath = readString(
    Reflect.get(window, SOLID_DEVTOOLS_PROJECT_PATH_GLOBAL_NAME),
  );
  if (!projectPath) return filePath;

  const normalizedProjectPath = projectPath.endsWith(ABSOLUTE_UNIX_PREFIX)
    ? projectPath.slice(0, -1)
    : projectPath;
  const normalizedFilePath = filePath.startsWith(RELATIVE_CURRENT_PREFIX)
    ? filePath.slice(2)
    : filePath;

  return `${normalizedProjectPath}/${normalizedFilePath}`;
};

const getLocatorDataRecord = (): Record<string, unknown> | null => {
  if (typeof window === "undefined") return null;
  const locatorData = Reflect.get(window, LOCATOR_DATA_GLOBAL_NAME);
  return isRecord(locatorData) ? locatorData : null;
};

const getLocatorFileData = (
  filePath: string,
): Record<string, unknown> | null => {
  const locatorData = getLocatorDataRecord();
  if (!locatorData) return null;
  const fileData = locatorData[filePath];
  return isRecord(fileData) ? fileData : null;
};

const getExpressionStart = (
  expression: unknown,
): LocatorExpressionStart | null => {
  if (!isRecord(expression)) return null;
  const location = expression.loc;
  if (!isRecord(location)) return null;
  const start = location.start;
  if (!isRecord(start)) return null;
  const lineNumber = readNumber(start.line);
  const columnNumber = readNumber(start.column);
  if (lineNumber === null || columnNumber === null) return null;
  return { lineNumber, columnNumber };
};

const getWrappingComponentName = (
  fileData: Record<string, unknown>,
  expression: unknown,
): string | null => {
  if (!isRecord(expression)) return null;
  const wrappingComponentId = readNumber(expression.wrappingComponentId);
  if (wrappingComponentId === null) return null;
  if (!Number.isInteger(wrappingComponentId)) return null;
  const componentList = readArray(fileData.components);
  const component = componentList[wrappingComponentId];
  if (!isRecord(component)) return null;
  return readString(component.name);
};

const findExpressionByLocation = (
  expressionList: unknown[],
  lineNumber: number,
  columnNumber: number,
): unknown | null => {
  for (const expression of expressionList) {
    const start = getExpressionStart(expression);
    if (!start) continue;
    if (start.lineNumber === lineNumber && start.columnNumber === columnNumber) {
      return expression;
    }
  }
  return null;
};

const parseLocatorId = (
  locatorId: string,
): { filePath: string; expressionId: number } | null => {
  const separatorIndex = locatorId.lastIndexOf(LOCATOR_ID_SEPARATOR);
  if (separatorIndex === -1) return null;

  const filePath = locatorId.slice(0, separatorIndex);
  const rawExpressionId = locatorId.slice(
    separatorIndex + LOCATOR_ID_SEPARATOR.length,
  );
  const expressionId = Number.parseInt(rawExpressionId, 10);

  if (!filePath) return null;
  if (Number.isNaN(expressionId)) return null;
  if (expressionId < 0) return null;

  return { filePath, expressionId };
};

const resolveFromLocatorPath = (
  locatorPath: string,
): ElementSourceInfo | null => {
  const parsedLocation = parseSourceLocation(locatorPath);
  if (!parsedLocation) return null;

  const fileData = getLocatorFileData(parsedLocation.filePath);
  const expressionList = fileData ? readArray(fileData.expressions) : [];
  const matchedExpression = findExpressionByLocation(
    expressionList,
    parsedLocation.lineNumber,
    parsedLocation.columnNumber,
  );
  const componentName =
    fileData && matchedExpression
      ? getWrappingComponentName(fileData, matchedExpression)
      : null;

  return {
    filePath: parsedLocation.filePath,
    lineNumber: parsedLocation.lineNumber,
    columnNumber: parsedLocation.columnNumber,
    componentName,
  };
};

const resolveFromLocatorId = (locatorId: string): ElementSourceInfo | null => {
  const parsedLocatorId = parseLocatorId(locatorId);
  if (!parsedLocatorId) return null;

  const fileData = getLocatorFileData(parsedLocatorId.filePath);
  const expressionList = fileData ? readArray(fileData.expressions) : [];
  const expression = expressionList[parsedLocatorId.expressionId];
  const expressionStart = getExpressionStart(expression);
  const componentName =
    fileData && expression ? getWrappingComponentName(fileData, expression) : null;

  return {
    filePath: parsedLocatorId.filePath,
    lineNumber: expressionStart?.lineNumber ?? null,
    columnNumber: expressionStart?.columnNumber ?? null,
    componentName,
  };
};

const resolveFromSolidDevtoolsLocation = (
  solidDevtoolsLocation: string,
): ElementSourceInfo | null => {
  const parsedLocation = parseSourceLocation(solidDevtoolsLocation);
  if (!parsedLocation) return null;

  return {
    filePath: normalizeSolidDevtoolsFilePath(parsedLocation.filePath),
    lineNumber: parsedLocation.lineNumber,
    columnNumber: parsedLocation.columnNumber,
    componentName: null,
  };
};

export const getSolidSourceInfo = (element: Element): ElementSourceInfo | null => {
  const sourceElement = element.closest(LOCATOR_ATTRIBUTE_SELECTOR);
  if (!sourceElement) return null;

  const locatorPath = sourceElement.getAttribute(LOCATOR_PATH_ATTRIBUTE_NAME);
  if (locatorPath) {
    const locatorPathInfo = resolveFromLocatorPath(locatorPath);
    if (locatorPathInfo) return locatorPathInfo;
  }

  const locatorId = sourceElement.getAttribute(LOCATOR_ID_ATTRIBUTE_NAME);
  if (locatorId) {
    const locatorIdInfo = resolveFromLocatorId(locatorId);
    if (locatorIdInfo) return locatorIdInfo;
  }

  const solidDevtoolsLocation = sourceElement.getAttribute(
    SOLID_DEVTOOLS_LOCATION_ATTRIBUTE_NAME,
  );
  if (solidDevtoolsLocation) {
    const solidDevtoolsInfo =
      resolveFromSolidDevtoolsLocation(solidDevtoolsLocation);
    if (solidDevtoolsInfo) return solidDevtoolsInfo;
  }

  return null;
};
