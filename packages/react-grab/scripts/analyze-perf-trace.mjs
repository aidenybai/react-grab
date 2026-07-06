#!/usr/bin/env node
// One-stop report over everything a labeled perf run produced:
//   - scenario metric reports (*.json from perf-recorder.ts): INP, LoAF,
//     FPS, and memory deltas per scenario
//   - V8 CPU profiles (*.cpuprofile, PERF_TRACE=1): function-level self-time
//     hotspots attributed to react-grab code (also understands the older
//     *.trace.json format with embedded Profile/ProfileChunk events)
//   - V8 deopt summary (deopt.summary.json from scripts/deopt-trace.mjs):
//     top deopt/bailout sites
// The top of each section is the next thing worth optimizing.
//
// Usage:
//   node scripts/analyze-perf-trace.mjs [perf/<label>] [--top=30] [--all] [--md=<output.md>]
//
// Default dir is perf/current. `--all` includes non-react-grab frames
// (browser internals, app code) which are hidden by default.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");

const cliArguments = process.argv.slice(2);
const positional = cliArguments.filter((argument) => !argument.startsWith("--"));
const flagValue = (flagName) => {
  const match = cliArguments.find((argument) => argument.startsWith(`--${flagName}=`));
  return match ? match.slice(flagName.length + 3) : undefined;
};
const profileDir = resolve(PACKAGE_ROOT, positional[0] ?? "perf/current");
const topCount = Number(flagValue("top") ?? 30);
const includeAllFrames = cliArguments.includes("--all");
const markdownOutputPath = flagValue("md");

const REACT_GRAB_URL_PATTERN =
  /react-grab|\/dist\/index\.(global\.)?js|\/src\/(core|components|utils)\//;

const isReactGrabFrame = (frameUrl) =>
  typeof frameUrl === "string" && REACT_GRAB_URL_PATTERN.test(frameUrl);

const shortUrl = (frameUrl) => {
  if (!frameUrl) return "(anonymous)";
  return frameUrl.replace(/^https?:\/\/[^/]+/, "").replace(/^.*node_modules\//, "npm:");
};

const collectProfilesFromTraceEvents = (traceEvents) => {
  const profilesById = new Map();
  for (const traceEvent of traceEvents) {
    if (traceEvent.name !== "Profile" && traceEvent.name !== "ProfileChunk") continue;
    const profileId = traceEvent.id ?? "default";
    if (!profilesById.has(profileId)) {
      profilesById.set(profileId, { nodes: [], samples: [], timeDeltas: [] });
    }
    const profile = profilesById.get(profileId);
    const chunk = traceEvent.args?.data?.cpuProfile ?? {};
    if (Array.isArray(chunk.nodes)) profile.nodes.push(...chunk.nodes);
    if (Array.isArray(chunk.samples)) profile.samples.push(...chunk.samples);
    if (Array.isArray(traceEvent.args?.data?.timeDeltas)) {
      profile.timeDeltas.push(...traceEvent.args.data.timeDeltas);
    }
  }
  return [...profilesById.values()];
};

const loadProfilesFromFile = async (profileFilePath) => {
  const parsed = JSON.parse(await readFile(profileFilePath, "utf8"));
  if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.samples)) {
    return [parsed];
  }
  const traceEvents = Array.isArray(parsed) ? parsed : parsed?.traceEvents;
  return Array.isArray(traceEvents) ? collectProfilesFromTraceEvents(traceEvents) : [];
};

const analyzeProfileFile = async (profileFilePath) => {
  const profiles = await loadProfilesFromFile(profileFilePath);
  if (profiles.length === 0) return null;

  const hotspotsByFunctionKey = new Map();
  let totalSampledMicroseconds = 0;

  for (const profile of profiles) {
    const nodesById = new Map();
    for (const node of profile.nodes ?? []) nodesById.set(node.id, node);

    const selfMicrosecondsByNodeId = new Map();
    const samples = profile.samples ?? [];
    const timeDeltas = profile.timeDeltas ?? [];
    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
      const deltaMicroseconds = timeDeltas[sampleIndex] ?? 0;
      if (deltaMicroseconds <= 0) continue;
      const nodeId = samples[sampleIndex];
      selfMicrosecondsByNodeId.set(
        nodeId,
        (selfMicrosecondsByNodeId.get(nodeId) ?? 0) + deltaMicroseconds,
      );
      totalSampledMicroseconds += deltaMicroseconds;
    }

    for (const [nodeId, selfMicroseconds] of selfMicrosecondsByNodeId) {
      const node = nodesById.get(nodeId);
      if (!node) continue;
      const { functionName, url, lineNumber } = node.callFrame ?? {};
      const displayName = functionName || "(anonymous)";
      if (displayName === "(root)" || displayName === "(idle)" || displayName === "(program)") {
        continue;
      }
      const isOwnFrame = isReactGrabFrame(url);
      if (!includeAllFrames && !isOwnFrame) continue;
      const location = `${shortUrl(url)}:${(lineNumber ?? -1) + 1}`;
      const functionKey = `${displayName}@${location}`;
      const existing = hotspotsByFunctionKey.get(functionKey);
      if (existing) {
        existing.selfMicroseconds += selfMicroseconds;
      } else {
        hotspotsByFunctionKey.set(functionKey, {
          functionName: displayName,
          location,
          selfMicroseconds,
          isOwnFrame,
        });
      }
    }
  }

  const hotspots = [...hotspotsByFunctionKey.values()].sort(
    (left, right) => right.selfMicroseconds - left.selfMicroseconds,
  );
  return { hotspots, totalSampledMicroseconds };
};

const formatMs = (microseconds) => (microseconds / 1000).toFixed(2);

const renderScenarioMetricsSection = async (metricFileNames) => {
  const lines = [
    `\n## Scenario metrics`,
    "",
    "| scenario | inp ms | long tasks | loaf max ms | fps mean | fps 5% low | dropped % | \u0394heap KB | \u0394nodes | \u0394listeners |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  let renderedRowCount = 0;
  for (const metricFileName of metricFileNames.sort()) {
    let report;
    try {
      report = JSON.parse(await readFile(resolve(profileDir, metricFileName), "utf8"));
    } catch {
      continue;
    }
    const aggregate = report?.aggregate;
    if (!aggregate) continue;
    const fps = aggregate.fps ?? {};
    const memoryDelta = report.memory?.delta ?? {};
    const formatCell = (value) => (value === undefined ? "-" : value);
    lines.push(
      `| ${report.scenario ?? metricFileName} | ${aggregate.inp} | ${aggregate.longTasks?.count ?? "-"} | ` +
        `${aggregate.longAnimationFrames?.max ?? "-"} | ${formatCell(fps.mean)} | ${formatCell(fps.p5Low)} | ` +
        `${formatCell(fps.droppedFramePercent)} | ${formatCell(memoryDelta.jsHeapUsedKb)} | ` +
        `${formatCell(memoryDelta.domNodes)} | ${formatCell(memoryDelta.jsEventListeners)} |`,
    );
    renderedRowCount += 1;
  }
  return renderedRowCount > 0 ? lines.join("\n") : null;
};

const renderDeoptSection = async () => {
  let deoptSummary;
  try {
    deoptSummary = JSON.parse(await readFile(resolve(profileDir, "deopt.summary.json"), "utf8"));
  } catch {
    return null;
  }
  const lines = [
    `\n## V8 deopts (from scripts/deopt-trace.mjs)`,
    `total deopt lines: ${deoptSummary.totalDeoptLines} | unique sites: ${deoptSummary.uniqueSites}`,
    "",
    "| count | type | kind | reason | function | position |",
    "| ---: | --- | --- | --- | --- | --- |",
  ];
  for (const entry of (deoptSummary.summary ?? []).slice(0, topCount)) {
    lines.push(
      `| ${entry.count} | ${entry.eventType} | ${entry.kind} | ${entry.reason} | \`${entry.fn}\` | \`${entry.position}\` |`,
    );
  }
  return lines.join("\n");
};

const renderScenarioReport = (scenarioName, analysis) => {
  const lines = [];
  lines.push(`\n## ${scenarioName}`);
  lines.push(
    `total sampled: ${formatMs(analysis.totalSampledMicroseconds)}ms | showing top ${topCount} ${includeAllFrames ? "frames" : "react-grab frames"} by self time`,
  );
  lines.push("");
  lines.push("| self ms | % of sampled | function | location |");
  lines.push("| ---: | ---: | --- | --- |");
  for (const hotspot of analysis.hotspots.slice(0, topCount)) {
    const percent = (
      (hotspot.selfMicroseconds / Math.max(1, analysis.totalSampledMicroseconds)) *
      100
    ).toFixed(1);
    lines.push(
      `| ${formatMs(hotspot.selfMicroseconds)} | ${percent}% | \`${hotspot.functionName}\` | \`${hotspot.location}\` |`,
    );
  }
  return lines.join("\n");
};

const main = async () => {
  let directoryEntries;
  try {
    directoryEntries = await readdir(profileDir);
  } catch {
    console.error(`No perf run dir at ${profileDir}. Run: pnpm test:perf:trace`);
    process.exit(1);
  }
  const profileFileNames = directoryEntries.filter(
    (entry) => entry.endsWith(".cpuprofile") || entry.endsWith(".trace.json"),
  );
  const metricFileNames = directoryEntries.filter(
    (entry) =>
      entry.endsWith(".json") && !entry.endsWith(".trace.json") && !entry.startsWith("deopt."),
  );
  if (profileFileNames.length === 0 && metricFileNames.length === 0) {
    console.error(`No perf outputs in ${profileDir}. Run: pnpm test:perf:trace`);
    process.exit(1);
  }

  const reportSections = [`# Perf run analysis`, `run dir: \`${profileDir}\``];
  const scenarioMetricsSection = await renderScenarioMetricsSection(metricFileNames);
  if (scenarioMetricsSection) reportSections.push(scenarioMetricsSection);
  const combinedByFunctionKey = new Map();

  for (const profileFileName of profileFileNames.sort()) {
    const scenarioName = profileFileName.replace(/\.(cpuprofile|trace\.json)$/, "");
    const analysis = await analyzeProfileFile(resolve(profileDir, profileFileName));
    if (!analysis) continue;
    reportSections.push(renderScenarioReport(scenarioName, analysis));
    for (const hotspot of analysis.hotspots) {
      const functionKey = `${hotspot.functionName}@${hotspot.location}`;
      const existing = combinedByFunctionKey.get(functionKey);
      if (existing) {
        existing.selfMicroseconds += hotspot.selfMicroseconds;
        existing.scenarioCount += 1;
      } else {
        combinedByFunctionKey.set(functionKey, { ...hotspot, scenarioCount: 1 });
      }
    }
  }

  const combinedHotspots = [...combinedByFunctionKey.values()].sort(
    (left, right) => right.selfMicroseconds - left.selfMicroseconds,
  );
  const combinedLines = [
    `\n## Combined across all scenarios`,
    "",
    "| self ms (sum) | scenarios | function | location |",
    "| ---: | ---: | --- | --- |",
  ];
  for (const hotspot of combinedHotspots.slice(0, topCount)) {
    combinedLines.push(
      `| ${formatMs(hotspot.selfMicroseconds)} | ${hotspot.scenarioCount} | \`${hotspot.functionName}\` | \`${hotspot.location}\` |`,
    );
  }
  if (combinedHotspots.length > 0) reportSections.push(combinedLines.join("\n"));
  const deoptSection = await renderDeoptSection();
  if (deoptSection) reportSections.push(deoptSection);

  const fullReport = reportSections.join("\n");
  console.log(fullReport);
  if (markdownOutputPath) {
    await writeFile(resolve(PACKAGE_ROOT, markdownOutputPath), `${fullReport}\n`);
    console.log(`\nwritten to ${markdownOutputPath}`);
  }
};

await main();
