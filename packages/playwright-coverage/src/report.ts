import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { V8CoverageEntry } from "./fixture.js";

const SOURCE_MAP_RE = /\/\/[#@]\s*sourceMappingURL=(\S+)/;
const DEFAULT_REPORTS = ["v8", "console-details", "lcovonly"];

interface ScriptCoverage {
  functions: unknown[];
}

// monocart's `Util.mergeV8Coverage` is the same bcoe/v8-coverage range-tree merge
// that `@bcoe/v8-coverage` ships, but it is part of the dependency we already
// pull in for reporting — so we reuse it instead of adding a second copy. It is
// real at runtime but missing from monocart's published `.d.ts`.
type MergeV8Coverage = (scriptCovs: ScriptCoverage[]) => { functions?: unknown[] };

interface UrlAccumulator {
  source: string;
  merged: ScriptCoverage;
}

interface FileLineSummary {
  covered: number;
  total: number;
}

export interface CoverageSummary {
  fileCount: number;
  coveredLines: number;
  totalLines: number;
  pctLines: number;
}

export interface GenerateCoverageOptions {
  /** Directory holding the per-test raw V8 dumps written during the run. */
  rawDir: string;
  /** Where monocart writes the generated reports. */
  outputDir: string;
  /** Base directory monocart resolves report paths against. Defaults to `process.cwd()`. */
  baseDir?: string;
  /** Report name shown in the html report. */
  name?: string;
  /** monocart report formats. Defaults to `["v8", "console-details", "lcovonly"]`. */
  reports?: string[];
  /** Keep only the source files you care about (receives an absolute path). */
  sourceFilter?: (sourcePath: string) => boolean;
  /** Verbose logging + dump the merged script URLs. Defaults to `Boolean(process.env.COVERAGE_DEBUG)`. */
  debug?: boolean;
}

/** Turn a served script URL into a local filesystem path, if it maps to one. */
const urlToLocalPath = (url: string): string | null => {
  if (url.startsWith("file://")) {
    try {
      return fileURLToPath(url);
    } catch {
      return null;
    }
  }
  // Vite serves out-of-root files (e.g. a linked dist) as http://host/@fs/<abs>.
  try {
    const { pathname } = new URL(url);
    const fsMarker = "/@fs";
    const fsIndex = pathname.indexOf(`${fsMarker}/`);
    // Keep the marker's trailing slash so the result stays an absolute path
    // (`/@fs/Users/x` -> `/Users/x`), not a relative one.
    if (fsIndex !== -1) return decodeURIComponent(pathname.slice(fsIndex + fsMarker.length));
  } catch {
    // `url` is a bare filesystem path, not a parseable URL; fall through to the
    // absolute-path check below rather than dropping the entry.
  }
  if (isAbsolute(url) && existsSync(url)) return url;
  return null;
};

const inlineMapDataUri = (mapJson: string): string =>
  `data:application/json;base64,${Buffer.from(mapJson).toString("base64")}`;

const applyInlineMap = (source: string, inlined: string): string => {
  if (SOURCE_MAP_RE.test(source)) {
    return source.replace(SOURCE_MAP_RE, `//# sourceMappingURL=${inlined}`);
  }
  return `${source}\n//# sourceMappingURL=${inlined}`;
};

/**
 * Rewrite a source map's `sources` to absolute paths relative to the map file.
 * The remapper otherwise resolves dist's `../src/index.ts` against `baseDir`
 * and loses the package segment (yielding `packages/src/...`); absolute sources
 * remove that ambiguity so coverage lands on `packages/<name>/src/...`.
 */
const absolutizeMapSources = (mapJson: string, mapPath: string): string => {
  const map = JSON.parse(mapJson) as { sources?: string[]; sourceRoot?: string };
  const mapDir = dirname(mapPath);
  const sourceRoot = map.sourceRoot ?? "";
  map.sources = (map.sources ?? []).map((source) =>
    isAbsolute(source) ? source : resolve(mapDir, sourceRoot, source),
  );
  map.sourceRoot = "";
  return JSON.stringify(map);
};

/**
 * Read every per-test raw V8 file and collapse them to one entry per script.
 *
 * Only scripts whose served URL resolves to an on-disk file with a sibling
 * `.map` are kept (the bundled dist we can remap); everything else — the app,
 * vite client, framework chunks — is dropped up front. Each test repeats the
 * full source of every script it loaded, so with hundreds of tests holding all
 * dumps would exhaust the heap. We merge each file's ranges into the running
 * accumulator immediately (via monocart's V8 range-tree merge) and keep a single
 * source per URL, bounding memory to the number of unique remappable scripts.
 */
const mergeRawCoverage = (
  rawDir: string,
  mergeV8Coverage: MergeV8Coverage,
): Map<string, UrlAccumulator> => {
  const accumulators = new Map<string, UrlAccumulator>();

  let files: string[];
  try {
    files = readdirSync(rawDir);
  } catch {
    return accumulators;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    let entries: V8CoverageEntry[];
    try {
      entries = JSON.parse(readFileSync(join(rawDir, file), "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (!entry.url || typeof entry.source !== "string") continue;
      const localPath = urlToLocalPath(entry.url);
      if (!localPath) continue;
      if (!existsSync(`${localPath}.map`)) continue;

      const scriptCov: ScriptCoverage = { functions: entry.functions ?? [] };
      const accumulator = accumulators.get(localPath);
      if (accumulator) {
        accumulator.merged = {
          functions: mergeV8Coverage([accumulator.merged, scriptCov]).functions ?? [],
        };
      } else {
        accumulators.set(localPath, { source: entry.source, merged: scriptCov });
      }
    }
  }

  return accumulators;
};

/**
 * Playwright's V8 coverage carries each script's `source` but not its source
 * map. A bundler typically serves an *external* `.map` sibling that the remapper
 * can't fetch over http, so inline it (with absolutized sources) and rewrite the
 * URL to the real path. This is what lets V8 hit counts on bundled dist remap
 * onto the original `src/*`.
 */
const toReportEntries = (accumulators: Map<string, UrlAccumulator>): V8CoverageEntry[] => {
  const entries: V8CoverageEntry[] = [];
  for (const [localPath, accumulator] of accumulators) {
    const siblingMapPath = `${localPath}.map`;
    try {
      const mapJson = absolutizeMapSources(readFileSync(siblingMapPath, "utf8"), siblingMapPath);
      entries.push({
        url: localPath,
        source: applyInlineMap(accumulator.source, inlineMapDataUri(mapJson)),
        scriptId: "0",
        functions: accumulator.merged.functions,
      });
    } catch {
      // skip: a script we can't pair with a readable map can't be remapped
    }
  }
  return entries;
};

/** monocart's `data.lines` value is a hit count or a "covered/total" string. */
const summarizeFileLines = (lines: Record<string, number | string>): FileLineSummary => {
  let covered = 0;
  let total = 0;
  for (const value of Object.values(lines)) {
    total++;
    const hits = typeof value === "number" ? value : Number(value.split("/")[0]);
    if (Number.isFinite(hits) && hits > 0) covered++;
  }
  return { covered, total };
};

/**
 * Merge the per-test raw V8 dumps, inline the dist source maps, and remap the
 * V8 byte ranges back onto `src/*` using monocart-coverage-reports as the remap
 * engine. monocart is loaded lazily so importing the fixture in test workers
 * never pulls in the heavy report dependency.
 */
export const generateCoverageReport = async (
  options: GenerateCoverageOptions,
): Promise<CoverageSummary | null> => {
  const debug = options.debug ?? Boolean(process.env.COVERAGE_DEBUG);

  const { default: MCR } = await import("monocart-coverage-reports");
  const mergeV8Coverage = (MCR.Util as unknown as { mergeV8Coverage: MergeV8Coverage })
    .mergeV8Coverage;

  const accumulators = mergeRawCoverage(options.rawDir, mergeV8Coverage);
  if (accumulators.size === 0) return null;

  if (debug) {
    const paths = [...accumulators.keys()].sort();
    console.log(`[coverage-debug] ${paths.length} merged scripts:`);
    for (const scriptPath of paths) console.log(`  ${scriptPath}`);
  }

  const mcr = MCR({
    name: options.name ?? "playwright coverage",
    outputDir: options.outputDir,
    baseDir: options.baseDir ?? process.cwd(),
    reports: options.reports ?? DEFAULT_REPORTS,
    cleanCache: true,
    logging: debug ? "debug" : "info",
    sourceFilter: options.sourceFilter,
  });

  await mcr.add(toReportEntries(accumulators));
  const results = await mcr.generate();
  const files = results?.files ?? [];

  let coveredLines = 0;
  let totalLines = 0;
  for (const file of files) {
    const summary = summarizeFileLines(file.data?.lines ?? {});
    coveredLines += summary.covered;
    totalLines += summary.total;
  }

  return {
    fileCount: files.length,
    coveredLines,
    totalLines,
    pctLines: totalLines === 0 ? 0 : (coveredLines / totalLines) * 100,
  };
};
