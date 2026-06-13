import { normalizeFileName } from "bippy/source";
import { safeDecodeURIComponent } from "./safe-decode-uri-component.js";

const NODE_MODULES_PATTERN = /(?:^|[/\\])node_modules[/\\]/;
const VITE_OPTIMIZED_DEPS_PATTERN = /[/\\]\.vite[/\\]deps[^/\\]*[/\\]/;
const FILE_EXTENSION_PATTERN = /\.[mc]?[jt]sx?$/i;
const VITE_INTERNAL_CHUNK_PATTERN = /^chunk-[A-Za-z0-9_-]+$/;
const PATH_SEPARATOR_PATTERN = /[/\\]/;
const NAME_AT_VERSION_PATTERN = /^(.+?)@v?\d/;

const splitPathSegments = (path: string): string[] =>
  path.split(PATH_SEPARATOR_PATTERN).filter(Boolean);

const readNodeModulesPackage = (afterMarker: string): string | null => {
  const [first, second] = splitPathSegments(afterMarker);
  if (!first || first.startsWith(".")) return null;
  if (!first.startsWith("@")) return first;
  return second ? `${first}/${second}` : null;
};

// Vite flattens scoped packages because filenames cannot contain a slash:
// `@radix-ui/react-dialog` becomes `@radix-ui_react-dialog.js`.
// Ambiguity: if the scope itself contains an underscore (`@my_org/pkg` ->
// `@my_org_pkg.js`), indexOf("_") splits at the wrong boundary. This is
// inherent to Vite's encoding and unresolvable without a registry lookup.
const readViteOptimizedDepPackage = (afterMarker: string): string | null => {
  const firstSegment = splitPathSegments(afterMarker)[0];
  if (!firstSegment) return null;
  const stem = firstSegment.replace(FILE_EXTENSION_PATTERN, "");
  if (VITE_INTERNAL_CHUNK_PATTERN.test(stem)) return null;
  if (!stem.startsWith("@")) return stem;
  const scopeBoundary = stem.indexOf("_");
  if (scopeBoundary === -1) return null;
  return `${stem.slice(0, scopeBoundary)}/${stem.slice(scopeBoundary + 1)}`;
};

const extractAfterLastMarker = (
  input: string,
  pattern: RegExp,
  read: (afterMarker: string) => string | null,
): string | null => {
  const parts = input.split(pattern);
  return parts.length > 1 ? read(parts[parts.length - 1]) : null;
};

const extractNameAtVersion = (segment: string | undefined): string | null =>
  segment?.match(NAME_AT_VERSION_PATTERN)?.[1] ?? null;

const extractVersionedPackageFromUrl = (rawFileName: string): string | null => {
  let url: URL;
  try {
    url = new URL(rawFileName);
  } catch {
    return null;
  }
  if (!url.hostname) return null;

  const segments = splitPathSegments(url.pathname).map(safeDecodeURIComponent);
  for (const [index, segment] of segments.entries()) {
    if (segment.startsWith("@")) {
      const name = extractNameAtVersion(segments[index + 1]);
      if (name) return `${segment}/${name}`;
      continue;
    }
    const name = extractNameAtVersion(segment);
    if (name) return name;
  }
  return null;
};

const extractFromLocalPath = (normalizedPath: string): string | null =>
  extractAfterLastMarker(
    normalizedPath,
    VITE_OPTIMIZED_DEPS_PATTERN,
    readViteOptimizedDepPackage,
  ) ?? extractAfterLastMarker(normalizedPath, NODE_MODULES_PATTERN, readNodeModulesPackage);

export const parsePackageName = (fileName: string | null | undefined): string | null => {
  if (!fileName) return null;

  const normalized = normalizeFileName(fileName);
  if (!normalized) return null;

  const decoded = safeDecodeURIComponent(normalized);

  const localResult = extractFromLocalPath(decoded);
  if (localResult) return localResult;

  const cdnResult = extractVersionedPackageFromUrl(fileName);
  if (cdnResult) return cdnResult;

  return null;
};

const SCOPED_PACKAGE_PATTERN = /^@[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PACKAGE_NAME_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// A scoped path like `@acme/app/...` or `../@acme/app/...` has no node_modules
// marker to prove it is third-party, so a monorepo's own app workspace would
// otherwise be misread as a package. Best-effort allowlist of common
// first-party workspace names.
const APPLICATION_PACKAGE_NAME_SEGMENTS = new Set([
  "app",
  "web",
  "website",
  "frontend",
  "client",
  "src",
]);

// Bundler aliases (`@app/components/...`, `@components/forms/...`) reuse the
// `@x/y` shape without being packages; real package scopes are org names, so
// scopes matching common app directory names are treated as aliases.
const ALIAS_SCOPE_SEGMENTS = new Set([
  "app",
  "src",
  "components",
  "pages",
  "features",
  "modules",
  "hooks",
  "lib",
  "utils",
  "ui",
  "shared",
  "common",
  "core",
  "styles",
  "assets",
]);

const stripRelativeSourcePathPrefix = (path: string): string => {
  let remainingPath = path;
  while (remainingPath.startsWith("../") || remainingPath.startsWith("./")) {
    remainingPath = remainingPath.slice(remainingPath.startsWith("../") ? 3 : 2);
  }
  return remainingPath;
};

const parseScopedPackageSourceName = (fileName: string): string | null => {
  const sourcePath = stripRelativeSourcePathPrefix(
    safeDecodeURIComponent(normalizeFileName(fileName)),
  );
  // Absolute paths (e.g. Vite's `/@fs/...`) point at first-party files; only
  // relative or bare `@scope/package/...` paths can be unmarked dependencies.
  if (sourcePath.startsWith("/")) return null;

  const [scope, packageName, ...innerPathSegments] = splitPathSegments(sourcePath);
  if (
    !scope ||
    !packageName ||
    innerPathSegments.length === 0 ||
    !SCOPED_PACKAGE_PATTERN.test(scope) ||
    ALIAS_SCOPE_SEGMENTS.has(scope.slice(1)) ||
    !PACKAGE_NAME_SEGMENT_PATTERN.test(packageName) ||
    FILE_EXTENSION_PATTERN.test(packageName) ||
    APPLICATION_PACKAGE_NAME_SEGMENTS.has(packageName)
  ) {
    return null;
  }

  return `${scope}/${packageName}`;
};

// parsePackageName keys off node_modules/.vite/CDN markers; the scoped fallback
// handles sourcemapped dependency paths like `../@acme/ui/...` or
// `@radix-ui/react-tabs/src/tabs.tsx` that carry no marker.
export const resolvePackageName = (fileName: string | null | undefined): string | null => {
  if (!fileName) return null;
  return parsePackageName(fileName) ?? parseScopedPackageSourceName(fileName);
};
