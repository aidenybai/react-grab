#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REGRESSION_PERCENT_THRESHOLD = 10;
const IMPROVEMENT_PERCENT_THRESHOLD = -10;
const SMALL_ABSOLUTE_NOISE_FLOOR_MS = 0.5;

const baselineDir = process.argv[2] ?? "packages/react-grab/perf/baseline";
const currentDir = process.argv[3] ?? "packages/react-grab/perf/current";

const loadReportsFromDir = async (dirPath) => {
  let entries;
  try {
    entries = await readdir(dirPath);
  } catch {
    return new Map();
  }
  const reportsByScenario = new Map();
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    if (entry.endsWith(".trace.json")) continue;
    const raw = await readFile(resolve(dirPath, entry), "utf8");
    reportsByScenario.set(entry.replace(/\.json$/, ""), JSON.parse(raw));
  }
  return reportsByScenario;
};

const formatDeltaCell = (baselineValue, currentValue) => {
  const absoluteDelta = currentValue - baselineValue;
  const baselineMagnitude = Math.abs(baselineValue);
  const isSmallChange = Math.abs(absoluteDelta) < SMALL_ABSOLUTE_NOISE_FLOOR_MS;
  const percentChange =
    baselineMagnitude < 1e-9
      ? currentValue > 0
        ? Infinity
        : 0
      : (absoluteDelta / baselineMagnitude) * 100;

  const sign = absoluteDelta > 0 ? "+" : "";
  const cellBody = `${baselineValue.toFixed(2)} → ${currentValue.toFixed(2)} (${sign}${absoluteDelta.toFixed(2)}, ${sign}${Number.isFinite(percentChange) ? percentChange.toFixed(1) + "%" : "∞"})`;

  if (isSmallChange) return cellBody;
  if (percentChange > REGRESSION_PERCENT_THRESHOLD) return `**${cellBody}** ▲`;
  if (percentChange < IMPROVEMENT_PERCENT_THRESHOLD) return `*${cellBody}* ▼`;
  return cellBody;
};

const baselineReports = await loadReportsFromDir(baselineDir);
const currentReports = await loadReportsFromDir(currentDir);

if (currentReports.size === 0) {
  console.log("> Perf diff skipped: no current data found.");
  process.exit(0);
}

if (baselineReports.size === 0) {
  console.log(
    "> Perf diff skipped: no baseline data — likely the first run on the base ref, or the bench harness didn't exist there yet. Current numbers are still uploaded as an artifact.",
  );
  process.exit(0);
}

const lines = [];
lines.push("## Perf diff — baseline (base ref) vs current (this PR)");
lines.push("");
lines.push(
  `Bold + ▲ = regression worse than +${REGRESSION_PERCENT_THRESHOLD}%. ` +
    `Italic + ▼ = improvement better than ${IMPROVEMENT_PERCENT_THRESHOLD}%. ` +
    `Changes under ${SMALL_ABSOLUTE_NOISE_FLOOR_MS}ms absolute are treated as noise.`,
);
lines.push("");
lines.push(
  "| Scenario | INP (ms) | LongTasks sum (ms) | LoAF sum (ms) | Frames p95 (ms) | Frames max (ms) |",
);
lines.push(
  "|----------|----------|--------------------|---------------|------------------|------------------|",
);

const scenariosOnlyInCurrent = [];
const scenariosOnlyInBaseline = [];

for (const scenarioName of [...currentReports.keys()].sort()) {
  const currentReport = currentReports.get(scenarioName);
  const baselineReport = baselineReports.get(scenarioName);
  if (!baselineReport) {
    scenariosOnlyInCurrent.push(scenarioName);
    continue;
  }
  const baselineAggregate = baselineReport.aggregate;
  const currentAggregate = currentReport.aggregate;
  lines.push(
    `| ${scenarioName} ` +
      `| ${formatDeltaCell(baselineAggregate.inp, currentAggregate.inp)} ` +
      `| ${formatDeltaCell(baselineAggregate.longTasks.sum, currentAggregate.longTasks.sum)} ` +
      `| ${formatDeltaCell(baselineAggregate.longAnimationFrames.sum, currentAggregate.longAnimationFrames.sum)} ` +
      `| ${formatDeltaCell(baselineAggregate.frames.p95, currentAggregate.frames.p95)} ` +
      `| ${formatDeltaCell(baselineAggregate.frames.max, currentAggregate.frames.max)} |`,
  );
}

// Scenario-specific scalar metrics the standard columns can't express (e.g.
// source-resolution latency under a saturated connection pool). Rendered as a
// separate table so the main one stays uncluttered.
const extraRows = [];
for (const scenarioName of [...currentReports.keys()].sort()) {
  const currentReport = currentReports.get(scenarioName);
  const baselineReport = baselineReports.get(scenarioName);
  if (!baselineReport || !currentReport.extra) continue;
  for (const metricName of Object.keys(currentReport.extra).sort()) {
    const currentValue = currentReport.extra[metricName];
    const baselineValue = baselineReport.extra?.[metricName];
    if (typeof currentValue !== "number" || typeof baselineValue !== "number") continue;
    extraRows.push(
      `| ${scenarioName} | ${metricName} | ${formatDeltaCell(baselineValue, currentValue)} |`,
    );
  }
}
if (extraRows.length > 0) {
  lines.push("");
  lines.push("### Scenario-specific metrics");
  lines.push("");
  lines.push("| Scenario | Metric | Baseline → Current (ms) |");
  lines.push("|----------|--------|-------------------------|");
  lines.push(...extraRows);
}

for (const baselineOnlyName of baselineReports.keys()) {
  if (!currentReports.has(baselineOnlyName)) scenariosOnlyInBaseline.push(baselineOnlyName);
}

if (scenariosOnlyInCurrent.length > 0) {
  lines.push("");
  lines.push(
    `_Scenarios new on this PR (no baseline to compare): ${scenariosOnlyInCurrent.join(", ")}_`,
  );
}
if (scenariosOnlyInBaseline.length > 0) {
  lines.push("");
  lines.push(`_Scenarios removed on this PR: ${scenariosOnlyInBaseline.join(", ")}_`);
}

console.log(lines.join("\n"));
