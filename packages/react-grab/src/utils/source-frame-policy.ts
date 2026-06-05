import { isSourceFile } from "bippy/source";
import type { SourceOptions } from "../types.js";
import { normalizeFilePath } from "./normalize-file-path.js";
import { resolvePackageName } from "./parse-package-name.js";

// Always ignored, in addition to any user-supplied ignorePaths: design-system
// wrappers (e.g. shadcn's components/ui) are rarely the file a user wants to
// edit, so grabs resolve to the consuming app source instead.
const DEFAULT_IGNORED_SOURCE_PATHS: readonly string[] = ["components/ui"];
const PATH_SEPARATOR_PATTERN = /[/\\]/;
// Keyed by fileName and only used when no custom ignorePaths are set; valid only
// while default classification depends solely on fileName.
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

  const packageName = resolvePackageName(fileName);
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
