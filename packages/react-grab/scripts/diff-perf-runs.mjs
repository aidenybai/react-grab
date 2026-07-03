#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REGRESSION_PERCENT_THRESHOLD = 10;
const IMPROVEMENT_PERCENT_THRESHOLD = -10;
const SMALL_ABSOLUTE_NOISE_FLOOR_MS = 0.5;
const INP_QUANTIZATION_STEP_MS = 8;

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
    const report = JSON.parse(raw);
    if (!report?.aggregate) continue;
    reportsByScenario.set(entry.replace(/\.json$/, ""), report);
  }
  return reportsByScenario;
};

const getPercentChange = (baselineValue, currentValue) => {
  const absoluteDelta = currentValue - baselineValue;
  const baselineMagnitude = Math.abs(baselineValue);
  if (baselineMagnitude < 1e-9) return currentValue > 0 ? Infinity : 0;
  return (absoluteDelta / baselineMagnitude) * 100;
};

const classifyChange = (baselineValue, currentValue) => {
  const absoluteDelta = currentValue - baselineValue;
  if (Math.abs(absoluteDelta) < SMALL_ABSOLUTE_NOISE_FLOOR_MS) return "unchanged";
  const percentChange = getPercentChange(baselineValue, currentValue);
  if (percentChange > REGRESSION_PERCENT_THRESHOLD) return "regression";
  if (percentChange < IMPROVEMENT_PERCENT_THRESHOLD) return "improvement";
  return "unchanged";
};

const formatValue = (value, unit) => {
  const useDecimal = unit === "ms" && Math.abs(value) < 100;
  return `${useDecimal ? value.toFixed(1) : value.toFixed(0)}${unit}`;
};

const formatPercent = (percentChange) => {
  if (!Number.isFinite(percentChange)) return "was 0";
  const rounded = Math.round(percentChange);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
};

const formatChange = (baselineValue, currentValue, unit) => {
  const percentChange = getPercentChange(baselineValue, currentValue);
  return `${formatValue(baselineValue, unit)} → ${formatValue(currentValue, unit)} (${formatPercent(percentChange)})`;
};

const STATUS_LABELS = {
  regression: "🔴 worse",
  improvement: "🟢 better",
};

const METRIC_DEFINITIONS = [
  {
    label: "Interaction latency (INP)",
    unit: "ms",
    getValue: (report) => report.aggregate.inp,
  },
  {
    label: "Main-thread blocking (long tasks)",
    unit: "ms",
    getValue: (report) => report.aggregate.longTasks.sum,
  },
  {
    label: "Janky frames (LoAF total)",
    unit: "ms",
    getValue: (report) => report.aggregate.longAnimationFrames.sum,
  },
  {
    label: "Frame time (p95)",
    unit: "ms",
    getValue: (report) => report.aggregate.frames.p95,
  },
  {
    label: "Frame time (worst)",
    unit: "ms",
    getValue: (report) => report.aggregate.frames.max,
  },
  {
    label: "Heap growth",
    unit: "KB",
    getValue: (report) => report.memory?.delta?.jsHeapUsedKb,
  },
  {
    label: "Leaked DOM nodes",
    unit: "",
    getValue: (report) => report.memory?.delta?.domNodes,
  },
];

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

const changedRows = [];
const detailRows = [];
const scenariosOnlyInCurrent = [];
const scenariosOnlyInBaseline = [];
let comparedScenarioCount = 0;

for (const scenarioName of [...currentReports.keys()].sort()) {
  const currentReport = currentReports.get(scenarioName);
  const baselineReport = baselineReports.get(scenarioName);
  if (!baselineReport) {
    scenariosOnlyInCurrent.push(scenarioName);
    continue;
  }
  comparedScenarioCount++;

  const detailCells = [];
  for (const { label, unit, getValue } of METRIC_DEFINITIONS) {
    const baselineValue = getValue(baselineReport);
    const currentValue = getValue(currentReport);
    if (typeof baselineValue !== "number" || typeof currentValue !== "number") {
      detailCells.push("–");
      continue;
    }
    const changeText = formatChange(baselineValue, currentValue, unit);
    const status = classifyChange(baselineValue, currentValue);
    if (status === "unchanged") {
      detailCells.push(changeText);
    } else {
      detailCells.push(`${changeText} ${STATUS_LABELS[status]}`);
      changedRows.push({ scenarioName, metricLabel: label, changeText, status });
    }
  }
  detailRows.push(`| ${scenarioName} | ${detailCells.join(" | ")} |`);

  for (const metricName of Object.keys(currentReport.extra ?? {}).sort()) {
    const currentValue = currentReport.extra[metricName];
    const baselineValue = baselineReport.extra?.[metricName];
    if (typeof currentValue !== "number" || typeof baselineValue !== "number") continue;
    const changeText = formatChange(baselineValue, currentValue, "ms");
    const status = classifyChange(baselineValue, currentValue);
    if (status !== "unchanged") {
      changedRows.push({ scenarioName, metricLabel: metricName, changeText, status });
    }
    detailRows.push(`| ${scenarioName} (${metricName}) | ${changeText} | – | – | – | – | – | – |`);
  }
}

for (const baselineOnlyName of baselineReports.keys()) {
  if (!currentReports.has(baselineOnlyName)) scenariosOnlyInBaseline.push(baselineOnlyName);
}

const regressions = changedRows.filter(({ status }) => status === "regression");
const improvements = changedRows.filter(({ status }) => status === "improvement");

const lines = [];
lines.push("## Performance report — this PR vs base branch");
lines.push("");

if (regressions.length === 0 && improvements.length === 0) {
  lines.push(`✅ **No performance changes detected** across ${comparedScenarioCount} scenarios.`);
} else {
  const summaryParts = [];
  if (regressions.length > 0) {
    summaryParts.push(
      `🔴 **${regressions.length} regression${regressions.length === 1 ? "" : "s"}**`,
    );
  }
  if (improvements.length > 0) {
    summaryParts.push(
      `🟢 **${improvements.length} improvement${improvements.length === 1 ? "" : "s"}**`,
    );
  }
  lines.push(`${summaryParts.join(" · ")} across ${comparedScenarioCount} scenarios.`);
  lines.push("");
  lines.push("| Scenario | Metric | Base → PR | Verdict |");
  lines.push("|----------|--------|-----------|---------|");
  const sortedChangedRows = [...regressions, ...improvements];
  for (const { scenarioName, metricLabel, changeText, status } of sortedChangedRows) {
    lines.push(`| ${scenarioName} | ${metricLabel} | ${changeText} | ${STATUS_LABELS[status]} |`);
  }
}

lines.push("");
lines.push(
  `<sub>A metric counts as changed when it moves more than ±${REGRESSION_PERCENT_THRESHOLD}% and at least ${SMALL_ABSOLUTE_NOISE_FLOOR_MS}ms. Interaction latency is measured in ${INP_QUANTIZATION_STEP_MS}ms steps, so single-step moves on fast scenarios can be noise.</sub>`,
);
lines.push("");
lines.push("<details>");
lines.push(`<summary>All ${comparedScenarioCount} scenarios (full numbers)</summary>`);
lines.push("");
lines.push(`| Scenario | ${METRIC_DEFINITIONS.map(({ label }) => label).join(" | ")} |`);
lines.push(`|----------|${METRIC_DEFINITIONS.map(() => "---").join("|")}|`);
lines.push(...detailRows);
lines.push("");
lines.push("</details>");

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
