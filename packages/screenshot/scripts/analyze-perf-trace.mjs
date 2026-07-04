#!/usr/bin/env node
// Hotspot report over a labeled perf run's V8 CPU profiles (*.cpuprofile,
// produced by `PERF_TRACE=1 pnpm bench`): function-level self-time attributed
// to fast-html-to-image code. The top of each section is the next thing
// worth optimizing.
//
// Usage:
//   node scripts/analyze-perf-trace.mjs [perf/<label>] [--top=30] [--all] [--md=<output.md>]
//
// Default dir is perf/current. `--all` includes non-library frames
// (browser internals, fixture code) which are hidden by default.
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

const LIBRARY_URL_PATTERN = /react-grab|\/dist\/index\.(global\.)?js|\/src\/(capture|utils)\//;

const isLibraryFrame = (frameUrl) =>
  typeof frameUrl === "string" && LIBRARY_URL_PATTERN.test(frameUrl);

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
      const isOwnFrame = isLibraryFrame(url);
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

const renderScenarioReport = (scenarioName, analysis) => {
  const lines = [];
  lines.push(`\n## ${scenarioName}`);
  lines.push(
    `total sampled: ${formatMs(analysis.totalSampledMicroseconds)}ms | showing top ${topCount} ${includeAllFrames ? "frames" : "library frames"} by self time`,
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
    console.error(`No perf run dir at ${profileDir}. Run: PERF_TRACE=1 pnpm bench`);
    process.exit(1);
  }
  const profileFileNames = directoryEntries.filter(
    (entry) => entry.endsWith(".cpuprofile") || entry.endsWith(".trace.json"),
  );
  if (profileFileNames.length === 0) {
    console.error(`No perf outputs in ${profileDir}. Run: PERF_TRACE=1 pnpm bench`);
    process.exit(1);
  }

  const reportSections = [`# Perf run analysis`, `run dir: \`${profileDir}\``];
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

  const fullReport = reportSections.join("\n");
  console.log(fullReport);
  if (markdownOutputPath) {
    await writeFile(resolve(PACKAGE_ROOT, markdownOutputPath), `${fullReport}\n`);
    console.log(`\nwritten to ${markdownOutputPath}`);
  }
};

await main();
