#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_PERCENT_THRESHOLD = 10;
// Frame-time percentiles and the memory probe's single before/after snapshot
// were observed swinging this much between CI runs of identical code (GC
// timing, runner scheduling), so only larger moves count as signal.
const FRAME_TIME_PERCENT_THRESHOLD = 30;
const MEMORY_PERCENT_THRESHOLD = 25;
// Saturated scenarios (hundreds of ms per interaction) inherit the runner's
// scheduling variance proportionally — identical code measured ±25% across CI
// runs — so heavy baselines need the wide threshold regardless of metric.
const HEAVY_BASELINE_MS = 100;
const HEAVY_BASELINE_PERCENT_THRESHOLD = 30;
const SMALL_ABSOLUTE_NOISE_FLOOR_MS = 0.5;
// Event timing (INP) is quantized to 8ms buckets, so a change of one bucket is
// indistinguishable from measurement noise; only a two-bucket move is signal.
const INP_QUANTIZATION_STEP_MS = 8;
const INP_NOISE_FLOOR_MS = INP_QUANTIZATION_STEP_MS * 2;
// Single-frame metrics (p95/max over ~60 frames) move in whole vsync steps on
// a shared runner whenever one frame slips, so one frame of movement is noise.
const FRAME_INTERVAL_NOISE_FLOOR_MS = 1000 / 60 + 1;
// Long task / LoAF sums have a reporting cliff at the 50ms threshold (a task
// jittering across it appears/disappears wholesale from the sum) and swing by
// hundreds of ms run-to-run on shared CI runners for animation-heavy
// scenarios, measured on identical code.
const LONG_TASK_THRESHOLD_NOISE_FLOOR_MS = 500;
const HEAP_NOISE_FLOOR_KB = 256;
const DOM_NODE_NOISE_FLOOR = 60;

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

const classifyChange = (
  baselineValue,
  currentValue,
  unit,
  noiseFloor = SMALL_ABSOLUTE_NOISE_FLOOR_MS,
  percentThreshold = DEFAULT_PERCENT_THRESHOLD,
) => {
  const absoluteDelta = currentValue - baselineValue;
  if (Math.abs(absoluteDelta) <= noiseFloor) return "unchanged";
  const effectiveThreshold =
    unit === "ms" && Math.abs(baselineValue) >= HEAVY_BASELINE_MS
      ? Math.max(percentThreshold, HEAVY_BASELINE_PERCENT_THRESHOLD)
      : percentThreshold;
  const percentChange = getPercentChange(baselineValue, currentValue);
  if (percentChange > effectiveThreshold) return "regression";
  if (percentChange < -effectiveThreshold) return "improvement";
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
    noiseFloor: INP_NOISE_FLOOR_MS,
    getValue: (report) => report.aggregate.inp,
  },
  {
    label: "Main-thread blocking (long tasks)",
    unit: "ms",
    noiseFloor: LONG_TASK_THRESHOLD_NOISE_FLOOR_MS,
    getValue: (report) => report.aggregate.longTasks.sum,
  },
  {
    label: "Janky frames (LoAF total)",
    unit: "ms",
    noiseFloor: LONG_TASK_THRESHOLD_NOISE_FLOOR_MS,
    getValue: (report) => report.aggregate.longAnimationFrames.sum,
  },
  {
    label: "Frame time (p95)",
    unit: "ms",
    noiseFloor: FRAME_INTERVAL_NOISE_FLOOR_MS,
    percentThreshold: FRAME_TIME_PERCENT_THRESHOLD,
    getValue: (report) => report.aggregate.frames.p95,
  },
  {
    label: "Frame time (worst)",
    unit: "ms",
    noiseFloor: FRAME_INTERVAL_NOISE_FLOOR_MS,
    percentThreshold: FRAME_TIME_PERCENT_THRESHOLD,
    getValue: (report) => report.aggregate.frames.max,
  },
  {
    label: "Heap growth",
    unit: "KB",
    noiseFloor: HEAP_NOISE_FLOOR_KB,
    percentThreshold: MEMORY_PERCENT_THRESHOLD,
    getValue: (report) => report.memory?.delta?.jsHeapUsedKb,
  },
  {
    label: "Leaked DOM nodes",
    unit: "",
    noiseFloor: DOM_NODE_NOISE_FLOOR,
    percentThreshold: MEMORY_PERCENT_THRESHOLD,
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
  for (const { label, unit, noiseFloor, percentThreshold, getValue } of METRIC_DEFINITIONS) {
    const baselineValue = getValue(baselineReport);
    const currentValue = getValue(currentReport);
    if (typeof baselineValue !== "number" || typeof currentValue !== "number") {
      detailCells.push("–");
      continue;
    }
    const changeText = formatChange(baselineValue, currentValue, unit);
    const status = classifyChange(baselineValue, currentValue, unit, noiseFloor, percentThreshold);
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
    const status = classifyChange(baselineValue, currentValue, "ms");
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
  `<sub>A metric counts as changed only past per-metric thresholds sized to measured shared-runner variance on identical code: interaction latency ±${DEFAULT_PERCENT_THRESHOLD}% and ${INP_NOISE_FLOOR_MS}ms (measured in ${INP_QUANTIZATION_STEP_MS}ms steps), frame times ±${FRAME_TIME_PERCENT_THRESHOLD}%, long-task/LoAF sums ±${DEFAULT_PERCENT_THRESHOLD}% and ${LONG_TASK_THRESHOLD_NOISE_FLOOR_MS}ms, memory ±${MEMORY_PERCENT_THRESHOLD}% and ${HEAP_NOISE_FLOOR_KB}KB / ${DOM_NODE_NOISE_FLOOR} nodes; any ms metric with a ≥${HEAVY_BASELINE_MS}ms baseline needs ±${HEAVY_BASELINE_PERCENT_THRESHOLD}%.</sub>`,
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
