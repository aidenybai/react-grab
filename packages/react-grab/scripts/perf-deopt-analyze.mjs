#!/usr/bin/env node
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PERF_OUTPUT_DIR = resolve(__dirname, "../perf");
const LOG_DIR = resolve(PERF_OUTPUT_DIR, "v8-log");

const PRINT_PREFIX = "[deopt-analyze]";
const log = (message) => console.log(`${PRINT_PREFIX} ${message}`);

const REACT_GRAB_SOURCE_HINT = /react-grab|@react-grab|packages\/react-grab/i;
const BIPPY_SOURCE_HINT = /bippy/i;

const ICTYPES = new Set([
  "LoadIC",
  "StoreIC",
  "KeyedLoadIC",
  "KeyedStoreIC",
  "LoadGlobalIC",
  "StoreGlobalIC",
  "StoreInArrayLiteralIC",
  "DefineKeyedOwnIC",
  "DefineNamedOwnIC",
]);

const IC_STATE_NAMES = {
  X: "no_feedback",
  0: "uninitialized",
  ".": "premonomorphic",
  1: "monomorphic",
  "^": "recompute_handler",
  P: "polymorphic",
  N: "megamorphic",
  G: "generic",
};

const parseCsvLine = (line) => {
  const parts = [];
  let current = "";
  let inQuotes = false;
  for (let charIndex = 0; charIndex < line.length; charIndex++) {
    const ch = line[charIndex];
    if (ch === '"' && (charIndex === 0 || line[charIndex - 1] !== "\\")) {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (ch === "," && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
};

const stripQuotes = (value) => {
  if (!value) return value;
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  return value;
};

const parseAddress = (hex) => {
  if (!hex || typeof hex !== "string") return null;
  return BigInt(hex);
};

const parseSourcePositionList = (text) => {
  if (!text) return [];
  const items = [];
  const re = /<([^>]+)>/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1];
    const lastColon = raw.lastIndexOf(":");
    const secondLastColon = raw.lastIndexOf(":", lastColon - 1);
    if (lastColon === -1 || secondLastColon === -1) {
      items.push({ url: raw, line: -1, column: -1 });
      continue;
    }
    const column = Number(raw.slice(lastColon + 1));
    const line = Number(raw.slice(secondLastColon + 1, lastColon));
    const url = raw.slice(0, secondLastColon);
    items.push({ url, line, column });
  }
  return items;
};

const parseFile = async (logPath) => {
  log(`parsing ${basename(logPath)} ...`);
  const text = await readFile(logPath, "utf8");
  const lines = text.split("\n");

  const codeIntervals = [];
  const deopts = [];
  const icRecords = [];

  for (const line of lines) {
    if (!line) continue;
    const firstCommaIndex = line.indexOf(",");
    const tag = firstCommaIndex === -1 ? line : line.slice(0, firstCommaIndex);

    if (tag === "code-creation") {
      const fields = parseCsvLine(line);
      const codeKind = fields[1];
      if (
        codeKind === "JS" ||
        codeKind === "LazyCompile" ||
        codeKind === "Function" ||
        codeKind === "Eval"
      ) {
        const startAddress = parseAddress(fields[4]);
        const size = Number(fields[5]);
        const symbolName = stripQuotes(fields[6] ?? "");
        if (startAddress !== null && Number.isFinite(size) && size > 0) {
          codeIntervals.push({
            start: startAddress,
            end: startAddress + BigInt(size),
            symbolName,
            codeKind,
          });
        }
      }
      continue;
    }

    if (tag === "code-deopt") {
      const fields = parseCsvLine(line);
      const positions = parseSourcePositionList(fields[7] ?? "");
      deopts.push({
        timestamp: Number(fields[1]),
        codeSize: Number(fields[2]),
        instructionStart: fields[3],
        inliningId: Number(fields[4]),
        scriptOffset: Number(fields[5]),
        bailoutType: fields[6],
        rawSourcePosition: fields[7] ?? "",
        positions,
        reason: stripQuotes(fields[8] ?? ""),
      });
      continue;
    }

    if (ICTYPES.has(tag)) {
      const fields = parseCsvLine(line);
      icRecords.push({
        type: fields[0],
        pc: parseAddress(fields[1]),
        time: Number(fields[2]),
        line: Number(fields[3]),
        column: Number(fields[4]),
        oldState: fields[5],
        newState: fields[6],
        mapId: fields[7],
        key: stripQuotes(fields[8] ?? ""),
        modifier: fields[9] ?? "",
        slowReason: stripQuotes(fields[10] ?? ""),
      });
      continue;
    }
  }

  return { codeIntervals, deopts, icRecords };
};

const buildCodeLookup = (codeIntervals) => {
  const sorted = [...codeIntervals].sort((entryA, entryB) =>
    entryA.start < entryB.start ? -1 : entryA.start > entryB.start ? 1 : 0,
  );
  const starts = sorted.map((entry) => entry.start);
  const lookup = (address) => {
    if (address === null) return null;
    let lowIndex = 0;
    let highIndex = sorted.length - 1;
    while (lowIndex <= highIndex) {
      const midIndex = (lowIndex + highIndex) >> 1;
      const candidate = sorted[midIndex];
      if (address < candidate.start) {
        highIndex = midIndex - 1;
      } else if (address >= candidate.end) {
        lowIndex = midIndex + 1;
      } else {
        return candidate;
      }
    }
    return null;
  };
  return { lookup, sorted, starts };
};

const cleanSymbolName = (symbolName) => {
  if (!symbolName) return "(anonymous)";
  return symbolName.replace(/^[~+]/, "").trim();
};

const extractFunctionUrl = (symbolName) => {
  const match = / (https?:\/\/[^\s]+|file:[^\s]+|\/@fs[^\s]+)/.exec(symbolName);
  if (!match) return null;
  return match[1];
};

const reasonGroup = (reasonString) => reasonString || "(no-reason)";

const formatTopList = (entries, limit) =>
  entries
    .slice(0, limit)
    .map((entry, entryIndex) => {
      const indexLabel = (entryIndex + 1).toString().padStart(2, " ");
      const countLabel = String(entry.count).padStart(5, " ");
      return `  ${indexLabel}. [${countLabel}]  ${entry.label}`;
    })
    .join("\n");

const sortMapDesc = (mapValue) =>
  Array.from(mapValue.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((entryA, entryB) => entryB.count - entryA.count);

const buildReport = ({ codeIntervals, deopts, icRecords }) => {
  const codeLookup = buildCodeLookup(codeIntervals);

  const deoptByReason = new Map();
  const deoptByLocation = new Map();
  const deoptByScript = new Map();
  const deoptsReactGrab = [];
  const deoptsBippy = [];

  for (const deopt of deopts) {
    const reasonKey = reasonGroup(deopt.reason);
    deoptByReason.set(reasonKey, (deoptByReason.get(reasonKey) ?? 0) + 1);

    const primaryPosition = deopt.positions[0];
    const scriptUrl = primaryPosition?.url ?? "(unknown)";
    const locationLabel = primaryPosition
      ? `${primaryPosition.url}:${primaryPosition.line}:${primaryPosition.column}`
      : deopt.rawSourcePosition;

    deoptByLocation.set(locationLabel, (deoptByLocation.get(locationLabel) ?? 0) + 1);
    deoptByScript.set(scriptUrl, (deoptByScript.get(scriptUrl) ?? 0) + 1);

    if (REACT_GRAB_SOURCE_HINT.test(scriptUrl)) {
      deoptsReactGrab.push({ ...deopt, locationLabel });
    } else if (BIPPY_SOURCE_HINT.test(scriptUrl)) {
      deoptsBippy.push({ ...deopt, locationLabel });
    }
  }

  const icByLocation = new Map();
  const icByTransition = new Map();
  const icMegamorphicByLocation = new Map();
  const icPolymorphicByLocation = new Map();
  const icReactGrabMegamorphic = [];
  const icReactGrabPolymorphic = [];
  const icSummaryByScript = new Map();

  for (const icRecord of icRecords) {
    const codeInfo = codeLookup.lookup(icRecord.pc);
    const cleanedSymbolName = cleanSymbolName(codeInfo?.symbolName);
    const containingUrl = codeInfo ? extractFunctionUrl(codeInfo.symbolName) : null;
    const baseLocationLabel = `${cleanedSymbolName}  key=${icRecord.key || "?"}  reason=${icRecord.slowReason || "-"}`;
    const transitionLabel = `${IC_STATE_NAMES[icRecord.oldState] || icRecord.oldState}->${IC_STATE_NAMES[icRecord.newState] || icRecord.newState}`;

    icByLocation.set(baseLocationLabel, (icByLocation.get(baseLocationLabel) ?? 0) + 1);
    icByTransition.set(transitionLabel, (icByTransition.get(transitionLabel) ?? 0) + 1);

    const isMegamorphic = icRecord.newState === "N";
    const isPolymorphic = icRecord.newState === "P";

    if (isMegamorphic) {
      icMegamorphicByLocation.set(
        baseLocationLabel,
        (icMegamorphicByLocation.get(baseLocationLabel) ?? 0) + 1,
      );
    }
    if (isPolymorphic) {
      icPolymorphicByLocation.set(
        baseLocationLabel,
        (icPolymorphicByLocation.get(baseLocationLabel) ?? 0) + 1,
      );
    }

    if (containingUrl) {
      icSummaryByScript.set(containingUrl, (icSummaryByScript.get(containingUrl) ?? 0) + 1);
    }

    if (containingUrl && REACT_GRAB_SOURCE_HINT.test(containingUrl)) {
      const entry = {
        type: icRecord.type,
        oldState: icRecord.oldState,
        newState: icRecord.newState,
        key: icRecord.key,
        slowReason: icRecord.slowReason,
        containingFunction: cleanedSymbolName,
        containingUrl,
        line: icRecord.line,
        column: icRecord.column,
      };
      if (isMegamorphic) icReactGrabMegamorphic.push(entry);
      if (isPolymorphic) icReactGrabPolymorphic.push(entry);
    }
  }

  const aggregateMap = (entries, keyFn) => {
    const accumulator = new Map();
    for (const entry of entries) {
      const groupKey = keyFn(entry);
      const prior = accumulator.get(groupKey);
      if (prior) {
        prior.count += 1;
      } else {
        accumulator.set(groupKey, { ...entry, count: 1 });
      }
    }
    return Array.from(accumulator.values()).sort((entryA, entryB) => entryB.count - entryA.count);
  };

  return {
    totals: {
      deopts: deopts.length,
      icEvents: icRecords.length,
      codeBlobs: codeIntervals.length,
    },
    deoptByReason: sortMapDesc(deoptByReason),
    deoptByScript: sortMapDesc(deoptByScript),
    deoptByLocation: sortMapDesc(deoptByLocation),
    deoptsReactGrab,
    deoptsBippy,
    icByTransition: sortMapDesc(icByTransition),
    icByLocation: sortMapDesc(icByLocation),
    icMegamorphicByLocation: sortMapDesc(icMegamorphicByLocation),
    icPolymorphicByLocation: sortMapDesc(icPolymorphicByLocation),
    icSummaryByScript: sortMapDesc(icSummaryByScript),
    icReactGrabMegamorphic: aggregateMap(
      icReactGrabMegamorphic,
      (entry) => `${entry.type}|${entry.containingFunction}|${entry.key}|${entry.slowReason}`,
    ),
    icReactGrabPolymorphic: aggregateMap(
      icReactGrabPolymorphic,
      (entry) => `${entry.type}|${entry.containingFunction}|${entry.key}|${entry.slowReason}`,
    ),
  };
};

const main = async () => {
  if (!existsSync(LOG_DIR)) {
    console.error(`[deopt-analyze] log dir ${LOG_DIR} does not exist — run perf-deopt.mjs first.`);
    process.exit(1);
  }

  const allEntries = await readdir(LOG_DIR);
  const logFiles = allEntries.filter((name) => name.endsWith(".log"));
  if (logFiles.length === 0) {
    console.error("[deopt-analyze] no .log files found in", LOG_DIR);
    process.exit(1);
  }

  const aggregated = { codeIntervals: [], deopts: [], icRecords: [] };
  for (const logFile of logFiles) {
    const fileSummary = await parseFile(resolve(LOG_DIR, logFile));
    aggregated.codeIntervals.push(...fileSummary.codeIntervals);
    aggregated.deopts.push(...fileSummary.deopts);
    aggregated.icRecords.push(...fileSummary.icRecords);
  }

  const report = buildReport(aggregated);

  log(
    `totals: ${report.totals.deopts} deopts, ${report.totals.icEvents} IC events, ${report.totals.codeBlobs} JS code blobs`,
  );

  log("\n=== top deopt reasons ===\n" + formatTopList(report.deoptByReason, 20));
  log("\n=== top deopt scripts ===\n" + formatTopList(report.deoptByScript, 15));
  log("\n=== top deopt sites (file:line:col) ===\n" + formatTopList(report.deoptByLocation, 30));

  log(`\n=== react-grab deopts: ${report.deoptsReactGrab.length} ===`);
  for (const [entryIndex, entry] of report.deoptsReactGrab.slice(0, 30).entries()) {
    log(
      `  ${(entryIndex + 1).toString().padStart(2, " ")}. ${entry.bailoutType}  reason="${entry.reason}"\n      at ${entry.locationLabel}`,
    );
  }

  log(`\n=== bippy deopts: ${report.deoptsBippy.length} ===`);
  for (const [entryIndex, entry] of report.deoptsBippy.slice(0, 15).entries()) {
    log(
      `  ${(entryIndex + 1).toString().padStart(2, " ")}. ${entry.bailoutType}  reason="${entry.reason}"\n      at ${entry.locationLabel}`,
    );
  }

  log("\n=== IC state transitions (totals) ===\n" + formatTopList(report.icByTransition, 20));
  log("\n=== top IC hot functions (any state) ===\n" + formatTopList(report.icByLocation, 25));
  log(
    `\n=== megamorphic IC sites in react-grab source: ${report.icReactGrabMegamorphic.length} ===`,
  );
  for (const [entryIndex, entry] of report.icReactGrabMegamorphic.slice(0, 25).entries()) {
    log(
      `  ${(entryIndex + 1).toString().padStart(2, " ")}. [${String(entry.count).padStart(5, " ")}]  ${entry.type}  ${entry.containingFunction}\n      key="${entry.key}"  reason="${entry.slowReason}"  url=${entry.containingUrl}`,
    );
  }
  log(
    `\n=== polymorphic IC sites in react-grab source: ${report.icReactGrabPolymorphic.length} ===`,
  );
  for (const [entryIndex, entry] of report.icReactGrabPolymorphic.slice(0, 15).entries()) {
    log(
      `  ${(entryIndex + 1).toString().padStart(2, " ")}. [${String(entry.count).padStart(5, " ")}]  ${entry.type}  ${entry.containingFunction}\n      key="${entry.key}"  reason="${entry.slowReason}"  url=${entry.containingUrl}`,
    );
  }

  const writableReport = JSON.parse(
    JSON.stringify(report, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
  );
  const summaryJsonPath = resolve(LOG_DIR, "summary.json");
  await writeFile(summaryJsonPath, JSON.stringify(writableReport, null, 2));
  log(`\nwrote ${summaryJsonPath}`);

  const summaryMarkdownPath = resolve(LOG_DIR, "summary.md");
  const markdownText = [
    "# React Grab — V8 deopt + IC summary",
    "",
    `Generated from a dexnode-equivalent --js-flags Chromium run. See manifest.json for flags.`,
    "",
    `- total deopts: **${report.totals.deopts}**`,
    `- total IC events: **${report.totals.icEvents}**`,
    `- JS code blobs: **${report.totals.codeBlobs}**`,
    `- react-grab-source deopts: **${report.deoptsReactGrab.length}**`,
    `- react-grab megamorphic IC sites: **${report.icReactGrabMegamorphic.length}** (${report.icReactGrabMegamorphic.reduce((accum, entry) => accum + entry.count, 0)} events)`,
    `- react-grab polymorphic IC sites: **${report.icReactGrabPolymorphic.length}** (${report.icReactGrabPolymorphic.reduce((accum, entry) => accum + entry.count, 0)} events)`,
    "",
    "## Top deopt reasons",
    ...report.deoptByReason.slice(0, 20).map((entry) => `- \`${entry.label}\` — ${entry.count}`),
    "",
    "## Top deopt scripts",
    ...report.deoptByScript.slice(0, 20).map((entry) => `- \`${entry.label}\` — ${entry.count}`),
    "",
    "## React-grab deopts",
    ...report.deoptsReactGrab.map(
      (entry) => `- \`${entry.bailoutType}\` — \`${entry.reason}\`\n  - ${entry.locationLabel}`,
    ),
    "",
    "## React-grab megamorphic IC sites",
    ...report.icReactGrabMegamorphic.map(
      (entry) =>
        `- **${entry.count}× ${entry.type}** in \`${entry.containingFunction}\`\n  - key: \`${entry.key}\`  reason: \`${entry.slowReason || "-"}\`\n  - ${entry.containingUrl}`,
    ),
    "",
    "## React-grab polymorphic IC sites",
    ...report.icReactGrabPolymorphic.map(
      (entry) =>
        `- **${entry.count}× ${entry.type}** in \`${entry.containingFunction}\`\n  - key: \`${entry.key}\`  reason: \`${entry.slowReason || "-"}\`\n  - ${entry.containingUrl}`,
    ),
    "",
    "## IC state transitions (totals)",
    ...report.icByTransition.slice(0, 20).map((entry) => `- \`${entry.label}\` — ${entry.count}`),
    "",
    "## IC volume by script",
    ...report.icSummaryByScript.slice(0, 20).map((entry) => `- ${entry.label} — ${entry.count}`),
    "",
  ].join("\n");
  await writeFile(summaryMarkdownPath, markdownText);
  log(`wrote ${summaryMarkdownPath}`);
};

main().catch((error) => {
  console.error("[deopt-analyze] fatal:", error);
  process.exit(1);
});
