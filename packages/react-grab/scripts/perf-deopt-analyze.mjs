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

const summarize = async (logPath) => {
  log(`parsing ${basename(logPath)} ...`);
  const text = await readFile(logPath, "utf8");
  const lines = text.split("\n");

  const codeCreateByAddress = new Map();
  const scriptSourcesById = new Map();
  const deopts = [];
  const icRecords = [];

  for (const line of lines) {
    if (!line) continue;
    const tag = line.slice(0, line.indexOf(",") === -1 ? line.length : line.indexOf(","));
    if (
      tag !== "code-creation" &&
      tag !== "code-deopt" &&
      tag !== "script-source" &&
      tag.length > 0 &&
      !tag.startsWith("LoadIC") &&
      !tag.startsWith("StoreIC") &&
      !tag.startsWith("KeyedLoadIC") &&
      !tag.startsWith("KeyedStoreIC") &&
      !tag.startsWith("LoadGlobalIC") &&
      !tag.startsWith("StoreGlobalIC") &&
      !tag.startsWith("StoreInArrayLiteralIC") &&
      tag !== "Set" &&
      tag !== "ic"
    ) {
      continue;
    }

    const fields = parseCsvLine(line);

    if (fields[0] === "script-source") {
      const scriptId = fields[1];
      const url = stripQuotes(fields[2] ?? "");
      const source = stripQuotes(fields.slice(3).join(","));
      if (scriptId) scriptSourcesById.set(scriptId, { url, source });
      continue;
    }

    if (fields[0] === "code-creation") {
      const codeKind = fields[1];
      const startAddress = fields[4];
      const symbolName = stripQuotes(fields[6] ?? "");
      const scriptId = fields[7];
      if (startAddress) {
        codeCreateByAddress.set(startAddress, {
          codeKind,
          symbolName,
          scriptId,
        });
      }
      continue;
    }

    if (fields[0] === "code-deopt") {
      const [
        ,
        timestamp,
        codeSize,
        instructionStart,
        inliningId,
        scriptOffset,
        bailoutType,
        sourcePositionText,
        deoptReasonText,
      ] = fields;
      deopts.push({
        timestamp: Number(timestamp),
        codeSize: Number(codeSize),
        instructionStart,
        inliningId: Number(inliningId),
        scriptOffset: Number(scriptOffset),
        bailoutType,
        sourcePosition: stripQuotes(sourcePositionText ?? ""),
        reason: stripQuotes(deoptReasonText ?? ""),
      });
      continue;
    }

    if (
      fields[0].endsWith("IC") ||
      fields[0] === "LoadIC" ||
      fields[0] === "StoreIC" ||
      fields[0] === "KeyedLoadIC" ||
      fields[0] === "KeyedStoreIC"
    ) {
      const [type, pc, time, line2, column, oldState, newState, mapId, key, modifier, slowReason] =
        fields;
      icRecords.push({
        type,
        pc,
        time: Number(time),
        line: Number(line2),
        column: Number(column),
        oldState,
        newState,
        mapId,
        key: stripQuotes(key ?? ""),
        modifier,
        slowReason: stripQuotes(slowReason ?? ""),
      });
      continue;
    }
  }

  log(
    `  parsed: ${deopts.length} deopts, ${icRecords.length} IC events, ${codeCreateByAddress.size} code blobs, ${scriptSourcesById.size} script sources`,
  );

  return { codeCreateByAddress, scriptSourcesById, deopts, icRecords };
};

const reasonGroup = (reasonString) => reasonString || "(no-reason)";
const positionScriptId = (sourcePosition) => {
  const match = /^S(\d+)O(-?\d+)$/.exec(sourcePosition);
  if (!match) return null;
  return { scriptId: match[1], offset: Number(match[2]) };
};

const sourceLineColumn = (sourceText, offset) => {
  if (!sourceText) return { line: -1, column: -1, snippet: "" };
  if (offset < 0 || offset >= sourceText.length) return { line: -1, column: -1, snippet: "" };
  let line = 1;
  let lastNewline = -1;
  for (let charIndex = 0; charIndex < offset; charIndex++) {
    if (sourceText.charCodeAt(charIndex) === 10) {
      line += 1;
      lastNewline = charIndex;
    }
  }
  const lineStart = lastNewline + 1;
  const nextNewline = sourceText.indexOf("\n", offset);
  const lineEnd = nextNewline === -1 ? sourceText.length : nextNewline;
  return {
    line,
    column: offset - lineStart + 1,
    snippet: sourceText.slice(lineStart, lineEnd).trim(),
  };
};

const formatTopList = (entries, limit) =>
  entries
    .slice(0, limit)
    .map(
      (entry, entryIndex) =>
        `  ${(entryIndex + 1).toString().padStart(2, " ")}. [${entry.count}]  ${entry.label}`,
    )
    .join("\n");

const buildReport = ({ codeCreateByAddress, scriptSourcesById, deopts, icRecords }) => {
  const deoptByReason = new Map();
  const deoptByLocation = new Map();
  const deoptByScript = new Map();
  const deoptsReactGrab = [];

  for (const deopt of deopts) {
    const reasonKey = reasonGroup(deopt.reason);
    deoptByReason.set(reasonKey, (deoptByReason.get(reasonKey) ?? 0) + 1);

    const positionInfo = positionScriptId(deopt.sourcePosition);
    let scriptUrl = "(unknown script)";
    let locationLabel = deopt.sourcePosition;
    let resolvedLineColumn = null;
    if (positionInfo) {
      const scriptInfo = scriptSourcesById.get(positionInfo.scriptId);
      scriptUrl = scriptInfo?.url || `(script ${positionInfo.scriptId})`;
      resolvedLineColumn = sourceLineColumn(scriptInfo?.source ?? "", positionInfo.offset);
      locationLabel = `${scriptUrl}:${resolvedLineColumn.line}:${resolvedLineColumn.column}`;
    }
    deoptByLocation.set(locationLabel, (deoptByLocation.get(locationLabel) ?? 0) + 1);
    deoptByScript.set(scriptUrl, (deoptByScript.get(scriptUrl) ?? 0) + 1);

    if (REACT_GRAB_SOURCE_HINT.test(scriptUrl) || REACT_GRAB_SOURCE_HINT.test(deopt.sourcePosition)) {
      deoptsReactGrab.push({
        ...deopt,
        scriptUrl,
        resolvedLineColumn,
      });
    }
  }

  const megamorphicByKey = new Map();
  const polymorphicByKey = new Map();
  for (const icRecord of icRecords) {
    if (!icRecord.newState) continue;
    const target = icRecord.newState.includes("MEGAMORPHIC")
      ? megamorphicByKey
      : icRecord.newState.includes("POLYMORPHIC")
        ? polymorphicByKey
        : null;
    if (!target) continue;
    const codeInfo = codeCreateByAddress.get(icRecord.pc);
    const symbolName = codeInfo?.symbolName || "(unknown)";
    const groupKey = `${icRecord.type}  ${symbolName}  key=${icRecord.key || "?"}  reason=${icRecord.slowReason || "-"}`;
    target.set(groupKey, (target.get(groupKey) ?? 0) + 1);
  }

  const sortMapDesc = (mapValue) =>
    Array.from(mapValue.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((entryA, entryB) => entryB.count - entryA.count);

  return {
    totals: { deopts: deopts.length, icEvents: icRecords.length },
    deoptByReason: sortMapDesc(deoptByReason),
    deoptByScript: sortMapDesc(deoptByScript),
    deoptByLocation: sortMapDesc(deoptByLocation),
    deoptsReactGrab,
    megamorphicGroups: sortMapDesc(megamorphicByKey),
    polymorphicGroups: sortMapDesc(polymorphicByKey),
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

  const aggregated = {
    codeCreateByAddress: new Map(),
    scriptSourcesById: new Map(),
    deopts: [],
    icRecords: [],
  };

  for (const logFile of logFiles) {
    const fileSummary = await summarize(resolve(LOG_DIR, logFile));
    for (const [address, codeInfo] of fileSummary.codeCreateByAddress) {
      aggregated.codeCreateByAddress.set(address, codeInfo);
    }
    for (const [scriptId, scriptInfo] of fileSummary.scriptSourcesById) {
      aggregated.scriptSourcesById.set(scriptId, scriptInfo);
    }
    aggregated.deopts.push(...fileSummary.deopts);
    aggregated.icRecords.push(...fileSummary.icRecords);
  }

  const report = buildReport(aggregated);

  log(`totals: ${report.totals.deopts} deopts, ${report.totals.icEvents} IC events`);
  log("\n=== top deopt reasons ===\n" + formatTopList(report.deoptByReason, 20));
  log("\n=== top deopt scripts ===\n" + formatTopList(report.deoptByScript, 20));
  log("\n=== top deopt sites (file:line:col) ===\n" + formatTopList(report.deoptByLocation, 30));
  log(
    `\n=== react-grab deopts: ${report.deoptsReactGrab.length} (first 25) ===\n` +
      report.deoptsReactGrab
        .slice(0, 25)
        .map(
          (entry, entryIndex) =>
            `  ${(entryIndex + 1).toString().padStart(2, " ")}. ${entry.bailoutType}  reason=\"${entry.reason}\"\n      at ${entry.scriptUrl}` +
            (entry.resolvedLineColumn
              ? `:${entry.resolvedLineColumn.line}:${entry.resolvedLineColumn.column}\n      > ${entry.resolvedLineColumn.snippet}`
              : ""),
        )
        .join("\n"),
  );
  log("\n=== top megamorphic IC sites ===\n" + formatTopList(report.megamorphicGroups, 25));
  log("\n=== top polymorphic IC sites ===\n" + formatTopList(report.polymorphicGroups, 15));

  const summaryPath = resolve(LOG_DIR, "summary.json");
  await writeFile(summaryPath, JSON.stringify(report, null, 2));
  log(`\nwrote ${summaryPath}`);

  const humanPath = resolve(LOG_DIR, "summary.md");
  const humanText = [
    "# React Grab — V8 deopt + IC summary",
    "",
    `Captured via dexnode-equivalent --js-flags: see manifest.json.`,
    "",
    `- total deopts: **${report.totals.deopts}**`,
    `- total IC events: **${report.totals.icEvents}**`,
    `- react-grab-source deopts: **${report.deoptsReactGrab.length}**`,
    "",
    "## Top deopt reasons",
    ...report.deoptByReason.slice(0, 20).map((entry) => `- \`${entry.label}\` — ${entry.count}`),
    "",
    "## Top deopt scripts",
    ...report.deoptByScript.slice(0, 20).map((entry) => `- \`${entry.label}\` — ${entry.count}`),
    "",
    "## Top deopt sites",
    ...report.deoptByLocation.slice(0, 30).map((entry) => `- ${entry.label} — ${entry.count}`),
    "",
    "## React-grab deopts (top 25)",
    ...report.deoptsReactGrab.slice(0, 25).map((entry) => {
      const location = entry.resolvedLineColumn
        ? `${entry.scriptUrl}:${entry.resolvedLineColumn.line}:${entry.resolvedLineColumn.column}`
        : entry.scriptUrl;
      const snippet = entry.resolvedLineColumn?.snippet ?? "";
      return `- \`${entry.bailoutType}\` — \`${entry.reason}\`\n  - ${location}\n  - \`${snippet}\``;
    }),
    "",
    "## Top megamorphic IC sites",
    ...report.megamorphicGroups.slice(0, 25).map((entry) => `- ${entry.label} — ${entry.count}`),
    "",
    "## Top polymorphic IC sites",
    ...report.polymorphicGroups.slice(0, 15).map((entry) => `- ${entry.label} — ${entry.count}`),
    "",
  ].join("\n");
  await writeFile(humanPath, humanText);
  log(`wrote ${humanPath}`);
};

main().catch((error) => {
  console.error("[deopt-analyze] fatal:", error);
  process.exit(1);
});
