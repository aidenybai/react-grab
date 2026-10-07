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
    "| scenario | inp ms | loaf max ms | fps 5% low | dropped % | browser CPU cores % | renderer % | GPU process % | hardware GPU % | produced fps | production duty % | animation ticks/s | draws/tick | active timeline % | zero-animation ms | active−paused renderer % | active−paused GPU process % | active−paused combined % | content layers | layer area × viewport | painted area × viewport | style ms | layout ms | paint ms | raster ms | compositor ms | Viz ms | CSS rules used | animations | valid run | Δheap KB | Δnodes |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |",
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
    const processCpu = report.processCpu?.aggregate ?? {};
    const hardwareGpu = report.hardwareGpu?.aggregate ?? {};
    const rendering = report.rendering ?? {};
    const compositing = report.compositing ?? {};
    const css = report.css ?? {};
    const animationLifecycle = report.animationLifecycle ?? {};
    const animationCounterfactualDelta = report.animationCounterfactual?.activeMinusPaused ?? {};
    const sampleValidity = report.validity?.samples?.aggregate;
    const cssActivity = aggregate.cssActivity ?? {};
    const formatCell = (value) => (value === undefined ? "-" : value);
    const rendererCpu = processCpu.byType?.renderer?.corePercent;
    const gpuProcessCpu =
      processCpu.byType?.GPU?.corePercent ?? processCpu.byType?.gpu?.corePercent;
    const hardwareGpuBusy = hardwareGpu.browserBusyMeanPercent ?? hardwareGpu.systemBusyMeanPercent;
    lines.push(
      `| ${report.scenario ?? metricFileName} | ${aggregate.inp} | ${aggregate.longAnimationFrames?.max ?? "-"} | ` +
        `${formatCell(fps.p5Low)} | ${formatCell(fps.droppedFramePercent)} | ` +
        `${formatCell(processCpu.totalCorePercent)} | ${formatCell(rendererCpu)} | ` +
        `${formatCell(gpuProcessCpu)} | ${formatCell(hardwareGpuBusy)} | ` +
        `${formatCell(rendering.frames?.productionRateFps)} | ` +
        `${formatCell(rendering.frames?.productionDutyCyclePercent)} | ` +
        `${formatCell(rendering.animationScheduling?.animationTicksPerSecond)} | ` +
        `${formatCell(rendering.animationScheduling?.drawsPerAnimationTick)} | ` +
        `${formatCell(animationLifecycle.activeTimelineDutyCyclePercent)} | ` +
        `${formatCell(animationLifecycle.zeroActiveAnimationMilliseconds)} | ` +
        `${formatCell(animationCounterfactualDelta.rendererCorePercent)} | ` +
        `${formatCell(animationCounterfactualDelta.gpuProcessCorePercent)} | ` +
        `${formatCell(animationCounterfactualDelta.combinedGraphicsPipelineCorePercent)} | ` +
        `${formatCell(compositing.maximumContentLayerCount)} | ` +
        `${formatCell(compositing.maximumClippedContentAreaViewportMultiple)} | ` +
        `${formatCell(compositing.paintedAreaViewportMultiple)} | ` +
        `${formatCell(rendering.style?.totalDurationMs)} | ${formatCell(rendering.layout?.totalDurationMs)} | ` +
        `${formatCell(rendering.paint?.totalDurationMs)} | ${formatCell(rendering.raster?.totalDurationMs)} | ` +
        `${formatCell(rendering.compositor?.totalDurationMs)} | ${formatCell(rendering.viz?.totalDurationMs)} | ` +
        `${formatCell(css.usedRuleCount)} | ${formatCell(cssActivity.activeAnimationsAtStart)}→${formatCell(cssActivity.activeAnimationsAtEnd)} | ` +
        `${sampleValidity ? (sampleValidity.validForHeadedMeasurement ? "yes" : `no: ${sampleValidity.violations?.join(", ")}`) : "-"} | ` +
        `${formatCell(memoryDelta.jsHeapUsedKb)} | ${formatCell(memoryDelta.domNodes)} |`,
    );
    renderedRowCount += 1;
  }
  return renderedRowCount > 0 ? lines.join("\n") : null;
};

const renderAnimationControlSection = async (metricFileNames) => {
  const reports = [];
  for (const metricFileName of metricFileNames.sort()) {
    try {
      const report = JSON.parse(await readFile(resolve(profileDir, metricFileName), "utf8"));
      if (report?.kind === "animation-scheduling-controls") reports.push(report);
    } catch {
      continue;
    }
  }
  if (reports.length === 0) return null;
  const lines = [
    `\n## Animation scheduling controls`,
    "",
    "Alternating three-repetition CPU pairs; deltas are active minus a production-count paused control.",
    "",
    "| mode | renderer % | GPU process % | combined graphics % | total browser % | paused combined % | Δ renderer % | Δ GPU process % | Δ combined % |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const report of reports) {
    for (const comparison of report.comparisons ?? []) {
      lines.push(
        `| ${comparison.mode} | ${comparison.active?.cpu?.rendererCorePercent ?? "-"} | ` +
          `${comparison.active?.cpu?.gpuProcessCorePercent ?? "-"} | ` +
          `${comparison.active?.cpu?.combinedGraphicsPipelineCorePercent ?? "-"} | ` +
          `${comparison.active?.cpu?.totalBrowserCorePercent ?? "-"} | ` +
          `${comparison.paused?.cpu?.combinedGraphicsPipelineCorePercent ?? "-"} | ` +
          `${comparison.activeMinusPaused?.rendererCorePercent ?? "-"} | ` +
          `${comparison.activeMinusPaused?.gpuProcessCorePercent ?? "-"} | ` +
          `${comparison.activeMinusPaused?.combinedGraphicsPipelineCorePercent ?? "-"} |`,
      );
    }
  }
  lines.push(
    "",
    "| mode | animation ticks/s | AnimateLayers | DrawFrame | draws/tick | produced fps | timeline duty % | zero-animation ms | prevented idle |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  );
  for (const report of reports) {
    for (const trace of report.traces ?? []) {
      const scheduling = trace.renderTrace?.pipeline?.animationScheduling ?? {};
      const frames = trace.renderTrace?.pipeline?.frames ?? {};
      const lifecycle = trace.renderTrace?.animationLifecycle ?? {};
      lines.push(
        `| ${trace.mode} | ${scheduling.animationTicksPerSecond ?? "-"} | ` +
          `${scheduling.animateLayersCount ?? "-"} | ${scheduling.drawFrameCount ?? "-"} | ` +
          `${scheduling.drawsPerAnimationTick ?? "-"} | ${frames.productionRateFps ?? "-"} | ` +
          `${lifecycle.activeTimelineDutyCyclePercent ?? "-"} | ` +
          `${lifecycle.zeroActiveAnimationMilliseconds ?? "-"} | ` +
          `${lifecycle.preventedTimelineIdle ?? "-"} |`,
      );
    }
  }
  return lines.join("\n");
};

const renderDomMutationAttributionSection = async (metricFileNames) => {
  const rows = [];
  for (const metricFileName of metricFileNames.sort()) {
    try {
      const report = JSON.parse(await readFile(resolve(profileDir, metricFileName), "utf8"));
      const attribution = report?.domMutationAttribution;
      if (!report?.scenario || !attribution?.available) continue;
      const sourceGroups = [
        ["application owner", attribution.topSources ?? []],
        ["mutation sink", attribution.topMutationSinks ?? []],
      ];
      for (const [sourceKind, sources] of sourceGroups) {
        for (const source of sources.slice(0, topCount)) {
          const location = source.url
            ? `${shortUrl(source.url)}:${source.lineNumber}:${source.columnNumber}`
            : `(inline script):${source.lineNumber}:${source.columnNumber}`;
          const snippet = String(source.sourceSnippet ?? "-")
            .replaceAll("|", "\\|")
            .replaceAll("\n", " ");
          rows.push(
            `| ${report.scenario} | ${sourceKind} | ${source.hitCount} | ${source.breakpointTypes?.join(", ") ?? "-"} | ` +
              `\`${source.functionName}\` | \`${location}\` | \`${snippet}\` |`,
          );
        }
      }
    } catch {
      continue;
    }
  }
  if (rows.length === 0) return null;
  return [
    `\n## DOM mutation source attribution`,
    "",
    "Captured by an intrusive DOM-breakpoint replay. Application owners are source-map resolved when possible; mutation sinks show the code that touched the DOM. These stacks are not timing evidence.",
    "",
    "| scenario | attribution | hits | mutation | function | source location | source line |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
};

const renderCssSelectorStatsSection = async (metricFileNames) => {
  const rows = [];
  for (const metricFileName of metricFileNames.sort()) {
    try {
      const report = JSON.parse(await readFile(resolve(profileDir, metricFileName), "utf8"));
      const selectorStats = report?.rendering?.selectorStats;
      if (!report?.scenario || !selectorStats?.topSelectors?.length) continue;
      const stylesheetUrlsById = new Map(
        (report.css?.stylesheets ?? []).map((stylesheet) => [
          stylesheet.styleSheetId,
          stylesheet.sourceUrl || "(inline stylesheet)",
        ]),
      );
      for (const selectorTiming of selectorStats.topSelectors.slice(0, topCount)) {
        const selector = String(selectorTiming.selector).replaceAll("|", "\\|");
        const stylesheet = String(
          stylesheetUrlsById.get(selectorTiming.styleSheetId) ?? selectorTiming.styleSheetId ?? "-",
        ).replaceAll("|", "\\|");
        rows.push(
          `| ${report.scenario} | ${selectorTiming.elapsedMs} | ${selectorTiming.matchAttempts} | ` +
            `${selectorTiming.matchCount} | ${selectorTiming.slowPathNonMatchPercent} | ` +
            `${selectorTiming.invalidationCount} | \`${selector}\` | \`${shortUrl(stylesheet)}\` |`,
        );
      }
    } catch {
      continue;
    }
  }
  if (rows.length === 0) return null;
  return [
    `\n## CSS selector matching`,
    "",
    "Captured from Chromium SelectorStats during the intrusive render replay. Elapsed time is selector-engine work; slow-path non-match percentage excludes fast rejects.",
    "",
    "| scenario | elapsed ms | attempts | matches | slow non-match % | invalidations | selector | stylesheet |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...rows,
  ].join("\n");
};

const renderAdvancedPaintSection = async (metricFileNames) => {
  const summaryRows = [];
  const displayItemRows = [];
  const layerProfileRows = [];
  for (const metricFileName of metricFileNames.sort()) {
    try {
      const report = JSON.parse(await readFile(resolve(profileDir, metricFileName), "utf8"));
      const advancedPaint = report?.rendering?.advancedPaint;
      const paintProfiles = report?.compositing?.paintProfiles ?? [];
      if (!report?.scenario || (!advancedPaint && paintProfiles.length === 0)) continue;
      if (
        (advancedPaint?.pictureSnapshotCount ?? 0) === 0 &&
        (advancedPaint?.displayItemListSnapshotCount ?? 0) === 0 &&
        paintProfiles.length === 0
      ) {
        continue;
      }
      summaryRows.push(
        `| ${report.scenario} | ${advancedPaint?.pictureSnapshotCount ?? 0} | ` +
          `${advancedPaint?.displayItemListSnapshotCount ?? 0} | ${advancedPaint?.displayItemCount ?? 0} | ` +
          `${advancedPaint?.paintedVisualAreaPx ?? 0} | ${paintProfiles.length} |`,
      );
      for (const displayItem of (advancedPaint?.topDisplayItems ?? []).slice(0, topCount)) {
        const displayItemName = String(displayItem.name).replaceAll("|", "\\|");
        displayItemRows.push(
          `| ${report.scenario} | \`${displayItemName}\` | ${displayItem.count} | ${displayItem.paintedVisualAreaPx} |`,
        );
      }
      for (const paintProfile of paintProfiles.slice(0, topCount)) {
        const target = String(paintProfile.target).replaceAll("|", "\\|");
        const topCommands = (paintProfile.topCommands ?? [])
          .slice(0, topCount)
          .map((command) => `${command.method} ×${command.count}`)
          .join(", ")
          .replaceAll("|", "\\|");
        layerProfileRows.push(
          `| ${report.scenario} | \`${target}\` | ${paintProfile.meanReplayDurationMs} | ` +
            `${paintProfile.profileRunCount} | ${paintProfile.commandCount} | \`${topCommands}\` |`,
        );
      }
    } catch {
      continue;
    }
  }
  if (summaryRows.length === 0) return null;
  const lines = [
    `\n## Advanced paint instrumentation`,
    "",
    "DevTools picture/display-item trace snapshots plus LayerTree Paint Profiler replays. Visual areas can overlap; profiler durations are isolated snapshot replays. Both are diagnostic evidence, not clean scenario timing.",
    "",
    "| scenario | picture snapshots | display-list snapshots | display items | summed visual area px | profiled layers |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...summaryRows,
  ];
  if (displayItemRows.length > 0) {
    lines.push(
      "",
      "| scenario | display item | count | summed visual area px |",
      "| --- | --- | ---: | ---: |",
      ...displayItemRows,
    );
  }
  if (layerProfileRows.length > 0) {
    lines.push(
      "",
      "| scenario | layer target | mean replay ms | profile runs | commands | top paint commands |",
      "| --- | --- | ---: | ---: | ---: | --- |",
      ...layerProfileRows,
    );
  }
  return lines.join("\n");
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
  const animationControlSection = await renderAnimationControlSection(metricFileNames);
  if (animationControlSection) reportSections.push(animationControlSection);
  const cssSelectorStatsSection = await renderCssSelectorStatsSection(metricFileNames);
  if (cssSelectorStatsSection) reportSections.push(cssSelectorStatsSection);
  const advancedPaintSection = await renderAdvancedPaintSection(metricFileNames);
  if (advancedPaintSection) reportSections.push(advancedPaintSection);
  const domMutationAttributionSection = await renderDomMutationAttributionSection(metricFileNames);
  if (domMutationAttributionSection) reportSections.push(domMutationAttributionSection);
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
