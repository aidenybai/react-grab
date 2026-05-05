import { normalizeFileName } from "bippy/source";

// Anchored to a path boundary (start of string, `/`, or `\`) so we don't
// accidentally match inside a longer identifier like `mynode_modules/`.
// Uses the global flag because callers iterate to find the *last* match
// (which collapses pnpm's `.pnpm/<pkg>@<ver>/node_modules/<pkg>/...`,
// Yarn PnP's `.zip/node_modules/<pkg>/...`, and Bun's
// `.bun/<pkg>@<ver>@@@1/node_modules/<pkg>/...` to the real package layer).
const NODE_MODULES_REGEX = /(?:^|[/\\])node_modules[/\\]/g;

// Vite's pre-bundled optimized deps live at `node_modules/.vite/deps/`, but
// while the dev server re-optimizes it temporarily writes to `deps_temp/`
// (or `deps_temp_<hash>/` on force re-optimize in Vite 5+). The trailing
// suffix is opaque to us, so the regex captures any `deps*` sibling.
const VITE_OPTIMIZED_DEPS_REGEX = /[/\\]\.vite[/\\]deps[^/\\]*[/\\]/g;

const FILE_EXTENSION_REGEX = /\.[mc]?[jt]sx?$/i;
const VITE_INTERNAL_CHUNK_REGEX = /^chunk-[A-Za-z0-9_-]+$/;
const PATH_SEPARATOR_REGEX = /[/\\]/;

// Hosts whose URLs follow the npm package URL convention
// `https://<host>/[prefix/]<scope>?/<name>@<version>/<file>`.
// Restricting to a known set avoids false positives on user paths that happen
// to contain an `@` character (e.g. `/Users/me@work/proj/foo.js`).
const KNOWN_PACKAGE_CDN_HOSTS = new Set([
  "esm.sh",
  "unpkg.com",
  "cdn.jsdelivr.net",
  "data.jsdelivr.com",
  "cdn.skypack.dev",
  "esm.run",
  "ga.jspm.io",
]);

const stripFileExtension = (segment: string): string => segment.replace(FILE_EXTENSION_REGEX, "");

// Splits on `/` or `\` and drops empty segments, so paths with consecutive
// separators (e.g. `/proj//node_modules//lucide-react/...` from poorly
// concatenated bundler URLs) still produce a clean segment list.
const splitPathSegments = (path: string): string[] =>
  path.split(PATH_SEPARATOR_REGEX).filter(Boolean);

// Reads `<scope>?/<name>` from the path tail that follows a `node_modules`
// boundary, rejecting hoist meta-directories like `.pnpm`, `.vite`, `.bin`,
// `.cache` (whose real packages live one level deeper and are picked up
// either by the `.vite/deps/` recognizer or by the last-match collapse
// past the meta-directory to the inner `node_modules/`).
const readNodeModulesPackage = (afterMarker: string): string | null => {
  const [first, second] = splitPathSegments(afterMarker);
  if (!first || first.startsWith(".")) return null;
  if (!first.startsWith("@")) return first;
  return second ? `${first}/${second}` : null;
};

// Vite flattens scoped optimized deps because filenames cannot contain a
// slash: `@radix-ui/react-dialog` is written as `@radix-ui_react-dialog.js`.
// Internal split chunks are emitted as `chunk-<hash>.js` and have no
// recoverable package origin, so we drop them.
const readViteOptimizedDepPackage = (afterMarker: string): string | null => {
  const stem = stripFileExtension(splitPathSegments(afterMarker)[0] ?? "");
  if (!stem || VITE_INTERNAL_CHUNK_REGEX.test(stem)) return null;
  if (!stem.startsWith("@")) return stem;
  const scopeBoundary = stem.indexOf("_");
  if (scopeBoundary === -1) return null;
  return `${stem.slice(0, scopeBoundary)}/${stem.slice(scopeBoundary + 1)}`;
};

const matchAfterLastPattern = (
  path: string,
  pattern: RegExp,
  read: (afterMarker: string) => string | null,
): string | null => {
  let lastMatchEnd = -1;
  for (const match of path.matchAll(pattern)) {
    lastMatchEnd = (match.index ?? 0) + match[0].length;
  }
  return lastMatchEnd === -1 ? null : read(path.slice(lastMatchEnd));
};

// Walks a CDN URL pathname looking for the first segment shaped like
// `<name>@<version>` (with an optional preceding `@scope` segment).
// Tolerates path prefixes used by various CDNs: `/npm/`, `/v135/`,
// `/stable/`, `/pin/`, etc.
const findVersionedPackageInPath = (pathname: string): string | null => {
  const segments = pathname.split("/").filter(Boolean);
  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const segment = segments[segmentIndex];
    if (segment.startsWith("@")) {
      const next = segments[segmentIndex + 1];
      if (!next) continue;
      const versionAtIndex = next.lastIndexOf("@");
      if (versionAtIndex > 0) return `${segment}/${next.slice(0, versionAtIndex)}`;
      continue;
    }
    const versionAtIndex = segment.lastIndexOf("@");
    if (versionAtIndex > 0) return segment.slice(0, versionAtIndex);
  }
  return null;
};

const matchKnownCdnUrl = (rawFileName: string): string | null => {
  let url: URL;
  try {
    url = new URL(rawFileName);
  } catch {
    return null;
  }
  if (!KNOWN_PACKAGE_CDN_HOSTS.has(url.hostname)) return null;
  return findVersionedPackageInPath(url.pathname);
};

// Recovers the npm package a stack frame originated from across the bundler
// matrix we care about (Vite, Webpack, Rollup, esbuild, Parcel, Turbopack,
// Next.js with source maps, plain Node, Yarn PnP, pnpm, Bun), plus a few
// common CDN URL shapes. Returns `null` whenever the path is ambiguous or
// clearly belongs to user source so callers can fall back to file-path-style
// output.
export const parsePackageName = (fileName: string | null | undefined): string | null => {
  if (!fileName) return null;

  const cdnPackage = matchKnownCdnUrl(fileName);
  if (cdnPackage) return cdnPackage;

  const normalized = normalizeFileName(fileName);
  if (!normalized) return null;

  return (
    matchAfterLastPattern(normalized, VITE_OPTIMIZED_DEPS_REGEX, readViteOptimizedDepPackage) ??
    matchAfterLastPattern(normalized, NODE_MODULES_REGEX, readNodeModulesPackage)
  );
};
