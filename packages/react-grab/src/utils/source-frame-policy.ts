import { isSourceFile, normalizeFileName } from "bippy/source";
import type { SourceOptions } from "../types.js";
import { normalizeFilePath } from "./normalize-file-path.js";
import { parsePackageName } from "./parse-package-name.js";
import { safeDecodeURIComponent } from "./safe-decode-uri-component.js";

const DEFAULT_IGNORED_SOURCE_PATHS: readonly string[] = ["components/ui"];
const PATH_SEPARATOR_PATTERN = /[/\\]/;
const SCOPED_PACKAGE_PATTERN = /^@[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PACKAGE_NAME_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const APPLICATION_PACKAGE_NAME_SEGMENTS = new Set(["app", "web", "website", "frontend", "client"]);
const defaultClassificationCache = new Map<string, SourcePathClassification>();

export interface SourcePathClassification {
  kind: "app-source" | "ignored-app-source" | "package-source" | "unknown";
  packageName: string | null;
}

const splitPathSegments = (path: string): string[] =>
  normalizeFilePath(path).split(PATH_SEPARATOR_PATTERN).filter(Boolean);

const DEFAULT_IGNORED_SOURCE_PATH_SEGMENTS = DEFAULT_IGNORED_SOURCE_PATHS.map((sourcePath) =>
  splitPathSegments(sourcePath),
);

const matchesPathSegments = (pathSegments: string[], patternSegments: string[]): boolean => {
  if (patternSegments.length === 0 || patternSegments.length > pathSegments.length) return false;

  for (let pathIndex = 0; pathIndex <= pathSegments.length - patternSegments.length; pathIndex++) {
    let didMatch = true;
    for (let patternIndex = 0; patternIndex < patternSegments.length; patternIndex++) {
      if (pathSegments[pathIndex + patternIndex] !== patternSegments[patternIndex]) {
        didMatch = false;
        break;
      }
    }
    if (didMatch) return true;
  }

  return false;
};

const matchesIgnoredSourcePath = (fileName: string, sourceOptions?: SourceOptions): boolean => {
  const normalizedPath = normalizeFilePath(fileName);
  const pathSegments = splitPathSegments(normalizedPath);

  for (const ignoredSourcePathSegments of DEFAULT_IGNORED_SOURCE_PATH_SEGMENTS) {
    if (matchesPathSegments(pathSegments, ignoredSourcePathSegments)) return true;
  }

  const customIgnoredSourcePaths = sourceOptions?.ignorePaths;
  if (!customIgnoredSourcePaths) return false;

  for (const ignoredSourcePath of customIgnoredSourcePaths) {
    if (typeof ignoredSourcePath === "string") {
      if (matchesPathSegments(pathSegments, splitPathSegments(ignoredSourcePath))) return true;
      continue;
    }

    ignoredSourcePath.lastIndex = 0;
    if (ignoredSourcePath.test(normalizedPath)) return true;
  }

  return false;
};

const stripRelativeSourcePathPrefix = (path: string): string | null => {
  let remainingPath = path;
  let didStripPrefix = false;
  while (remainingPath.startsWith("../") || remainingPath.startsWith("./")) {
    didStripPrefix = true;
    remainingPath = remainingPath.slice(remainingPath.startsWith("../") ? 3 : 2);
  }
  return didStripPrefix ? remainingPath : null;
};

const parseScopedPackageSourceName = (fileName: string): string | null => {
  const sourcePath = stripRelativeSourcePathPrefix(
    safeDecodeURIComponent(normalizeFileName(fileName)),
  );
  if (!sourcePath) return null;

  const [scope, packageName] = sourcePath.split(PATH_SEPARATOR_PATTERN).filter(Boolean);
  if (
    !scope ||
    !packageName ||
    !SCOPED_PACKAGE_PATTERN.test(scope) ||
    !PACKAGE_NAME_SEGMENT_PATTERN.test(packageName) ||
    APPLICATION_PACKAGE_NAME_SEGMENTS.has(packageName)
  ) {
    return null;
  }

  return `${scope}/${packageName}`;
};

export const classifySourcePath = (
  fileName: string | null | undefined,
  sourceOptions?: SourceOptions,
): SourcePathClassification => {
  if (!fileName || sourceOptions?.ignorePaths?.length) {
    return classifySourcePathUncached(fileName, sourceOptions);
  }

  const cachedClassification = defaultClassificationCache.get(fileName);
  if (cachedClassification) return cachedClassification;

  const classification = classifySourcePathUncached(fileName, sourceOptions);
  defaultClassificationCache.set(fileName, classification);
  return classification;
};

const classifySourcePathUncached = (
  fileName: string | null | undefined,
  sourceOptions?: SourceOptions,
): SourcePathClassification => {
  if (!fileName) {
    return { kind: "unknown", packageName: null };
  }

  const packageName = parsePackageName(fileName) ?? parseScopedPackageSourceName(fileName);
  if (packageName) {
    return { kind: "package-source", packageName };
  }

  if (!isSourceFile(fileName)) {
    return { kind: "unknown", packageName: null };
  }

  if (matchesIgnoredSourcePath(fileName, sourceOptions)) {
    return { kind: "ignored-app-source", packageName: null };
  }

  return { kind: "app-source", packageName: null };
};
