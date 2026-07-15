import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CDPSession, Page, TestInfo } from "@playwright/test";
import { originalPositionFor, sourceContentFor, TraceMap } from "@jridgewell/trace-mapping";
import {
  PERF_DOM_BREAKPOINT_ASYNC_STACK_DEPTH,
  PERF_DOM_BREAKPOINT_FRAME_LIMIT,
  PERF_DOM_BREAKPOINT_HIT_LIMIT,
  PERF_DOM_BREAKPOINT_SINK_FRAME_LIMIT,
  PERF_DOM_BREAKPOINT_SOURCE_SNIPPET_LIMIT,
} from "./perf-constants.js";
import {
  startPerfRunValidityProbe,
  type PerfRunValidityProbe,
  type PerfRunValiditySummary,
} from "./perf-validity.js";

export interface PerfDomMutationSourceFrame {
  functionName: string;
  url: string;
  scriptId: string;
  lineNumber: number;
  columnNumber: number;
  sourceSnippet?: string;
  sourceMapped: boolean;
  generatedUrl?: string;
  generatedLineNumber?: number;
  generatedColumnNumber?: number;
  asynchronous: boolean;
}

export interface PerfDomMutationNode {
  nodeId: number;
  backendNodeId?: number;
  nodeName: string;
  selector: string;
}

export interface PerfDomMutationBreakpointHit {
  breakpointType: string;
  insertion?: boolean;
  node?: PerfDomMutationNode;
  frames: PerfDomMutationSourceFrame[];
}

export interface PerfDomMutationTopSource {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
  sourceSnippet?: string;
  sourceMapped: boolean;
  hitCount: number;
  breakpointTypes: string[];
}

export interface PerfDomMutationAttributionReport {
  available: boolean;
  intrusive: true;
  hitLimit: number;
  hitLimitReached: boolean;
  hitCount: number;
  installedBreakpointCount: number;
  requestedTargetSelectors: string[];
  resolvedTargetSelectors: string[];
  topSources: PerfDomMutationTopSource[];
  topMutationSinks: PerfDomMutationTopSource[];
  hits: PerfDomMutationBreakpointHit[];
  validity?: PerfRunValiditySummary;
  artifact?: string;
  warnings: string[];
  error?: string;
}

interface DebuggerLocation {
  scriptId: string;
  lineNumber: number;
  columnNumber?: number;
}

interface DebuggerCallFrame {
  functionName: string;
  url: string;
  location: DebuggerLocation;
}

interface RuntimeCallFrame {
  functionName: string;
  url: string;
  scriptId: string;
  lineNumber: number;
  columnNumber: number;
}

interface RuntimeStackTrace {
  callFrames: RuntimeCallFrame[];
  parent?: RuntimeStackTrace;
}

interface DebuggerPausedEvent {
  reason: string;
  data?: Record<string, string | number | boolean>;
  callFrames: DebuggerCallFrame[];
  asyncStackTrace?: RuntimeStackTrace;
}

interface DebuggerScriptParsedEvent {
  scriptId: string;
  url: string;
  sourceMapURL?: string;
}

interface DomNode {
  nodeId: number;
  backendNodeId?: number;
  nodeName: string;
  localName: string;
  attributes?: string[];
}

interface DomDocumentResponse {
  root: DomNode;
}

interface DomQuerySelectorResponse {
  nodeId: number;
}

interface DomQuerySelectorAllResponse {
  nodeIds: number[];
}

interface DomDescribeNodeResponse {
  node: DomNode;
}

interface DebuggerScriptSourceResponse {
  scriptSource: string;
}

interface InstalledDomBreakpoint {
  nodeId: number;
  type: "subtree-modified" | "attribute-modified" | "node-removed";
}

interface MutableDomMutationTopSource extends PerfDomMutationTopSource {
  breakpointTypeSet: Set<string>;
}

interface LoadedSourceMap {
  traceMap: TraceMap;
}

const attributesToMap = (attributes: string[] | undefined): Map<string, string> => {
  const attributeMap = new Map<string, string>();
  if (!attributes) return attributeMap;
  for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex += 2) {
    attributeMap.set(attributes[attributeIndex], attributes[attributeIndex + 1] ?? "");
  }
  return attributeMap;
};

const describeNodeSelector = (node: DomNode): string => {
  const attributes = attributesToMap(node.attributes);
  const identifier = attributes.get("id");
  const classNames = attributes.get("class")?.trim().split(/\s+/).filter(Boolean).slice(0, 3);
  return `${node.localName || node.nodeName.toLowerCase()}${identifier ? `#${identifier}` : ""}${
    classNames?.map((className) => `.${className}`).join("") ?? ""
  }`;
};

const flattenAsyncFrames = (stackTrace: RuntimeStackTrace | undefined): RuntimeCallFrame[] => {
  const frames: RuntimeCallFrame[] = [];
  let currentStackTrace = stackTrace;
  while (currentStackTrace) {
    frames.push(...currentStackTrace.callFrames);
    currentStackTrace = currentStackTrace.parent;
  }
  return frames;
};

const createSourceFrames = (event: DebuggerPausedEvent): PerfDomMutationSourceFrame[] => {
  const synchronousFrames = event.callFrames.map((callFrame) => ({
    functionName: callFrame.functionName || "(anonymous)",
    url: callFrame.url,
    scriptId: callFrame.location.scriptId,
    lineNumber: callFrame.location.lineNumber + 1,
    columnNumber: (callFrame.location.columnNumber ?? 0) + 1,
    sourceMapped: false,
    asynchronous: false,
  }));
  const asynchronousFrames = flattenAsyncFrames(event.asyncStackTrace).map((callFrame) => ({
    functionName: callFrame.functionName || "(anonymous)",
    url: callFrame.url,
    scriptId: callFrame.scriptId,
    lineNumber: callFrame.lineNumber + 1,
    columnNumber: callFrame.columnNumber + 1,
    sourceMapped: false,
    asynchronous: true,
  }));
  return [...synchronousFrames, ...asynchronousFrames].slice(0, PERF_DOM_BREAKPOINT_FRAME_LIMIT);
};

const loadSourceMap = async (
  script: DebuggerScriptParsedEvent,
): Promise<LoadedSourceMap | null> => {
  if (!script.sourceMapURL) return null;
  try {
    if (script.sourceMapURL.startsWith("data:")) {
      const separatorIndex = script.sourceMapURL.indexOf(",");
      if (separatorIndex < 0) return null;
      const metadata = script.sourceMapURL.slice(0, separatorIndex);
      const payload = script.sourceMapURL.slice(separatorIndex + 1);
      const sourceMapText = metadata.includes(";base64")
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      return { traceMap: new TraceMap(sourceMapText, script.url) };
    }
    const sourceMapUrl = new URL(script.sourceMapURL, script.url).href;
    const response = await fetch(sourceMapUrl);
    if (!response.ok) return null;
    return {
      traceMap: new TraceMap(await response.text(), sourceMapUrl),
    };
  } catch {
    return null;
  }
};

const enrichSourceFrames = async (
  session: CDPSession,
  hits: PerfDomMutationBreakpointHit[],
  scriptsById: Map<string, DebuggerScriptParsedEvent>,
  warnings: string[],
): Promise<void> => {
  const sourceByScriptId = new Map<string, string>();
  const sourceMapByScriptId = new Map<string, LoadedSourceMap | null>();
  const scriptIds = new Set(hits.flatMap((hit) => hit.frames.map((frame) => frame.scriptId)));
  for (const scriptId of scriptIds) {
    const script = scriptsById.get(scriptId);
    sourceMapByScriptId.set(scriptId, script ? await loadSourceMap(script) : null);
    try {
      const response: DebuggerScriptSourceResponse = await session.send(
        "Debugger.getScriptSource",
        { scriptId },
      );
      sourceByScriptId.set(scriptId, response.scriptSource);
    } catch {
      sourceByScriptId.set(scriptId, "");
      warnings.push(`Could not read debugger source for ${script?.url || `script ${scriptId}`}`);
    }
  }
  for (const hit of hits) {
    for (const frame of hit.frames) {
      const script = scriptsById.get(frame.scriptId);
      if (!frame.url && script?.url) frame.url = script.url;
      const loadedSourceMap = sourceMapByScriptId.get(frame.scriptId);
      if (loadedSourceMap) {
        const originalPosition = originalPositionFor(loadedSourceMap.traceMap, {
          line: frame.lineNumber,
          column: frame.columnNumber - 1,
        });
        if (originalPosition.source && originalPosition.line !== null) {
          frame.generatedUrl = frame.url;
          frame.generatedLineNumber = frame.lineNumber;
          frame.generatedColumnNumber = frame.columnNumber;
          frame.url = originalPosition.source;
          frame.lineNumber = originalPosition.line;
          frame.columnNumber = (originalPosition.column ?? 0) + 1;
          frame.functionName = originalPosition.name ?? frame.functionName;
          frame.sourceMapped = true;
          const originalSource = sourceContentFor(
            loadedSourceMap.traceMap,
            originalPosition.source,
          );
          const originalSourceLine = originalSource?.split("\n")[frame.lineNumber - 1];
          if (originalSourceLine) {
            frame.sourceSnippet = originalSourceLine
              .slice(0, PERF_DOM_BREAKPOINT_SOURCE_SNIPPET_LIMIT)
              .trimEnd();
          }
        }
      }
      if (frame.sourceSnippet) continue;
      const sourceLine = sourceByScriptId.get(frame.scriptId)?.split("\n")[
        (frame.generatedLineNumber ?? frame.lineNumber) - 1
      ];
      if (sourceLine) {
        frame.sourceSnippet = sourceLine
          .slice(0, PERF_DOM_BREAKPOINT_SOURCE_SNIPPET_LIMIT)
          .trimEnd();
      }
    }
  }
};

const isReactRenderingInternalFrame = (frame: PerfDomMutationSourceFrame): boolean =>
  frame.url.includes("/react-dom") ||
  frame.url.includes("react-dom_") ||
  frame.url.includes("/react_jsx") ||
  frame.url.includes("/react-jsx");

const selectApplicationSourceFrame = (
  hit: PerfDomMutationBreakpointHit,
): PerfDomMutationSourceFrame | undefined => {
  const applicationFrames = hit.frames.filter(
    (frame) => Boolean(frame.url) && !isReactRenderingInternalFrame(frame),
  );
  const firstApplicationFrame = applicationFrames[0];
  if (!firstApplicationFrame) return undefined;
  return (
    applicationFrames.find(
      (frame) =>
        frame.url === firstApplicationFrame.url &&
        frame.lineNumber === firstApplicationFrame.lineNumber &&
        frame.functionName !== "(anonymous)",
    ) ?? firstApplicationFrame
  );
};

const selectMutationSinkFrame = (
  hit: PerfDomMutationBreakpointHit,
): PerfDomMutationSourceFrame | undefined =>
  hit.frames.find((frame) => !frame.asynchronous && Boolean(frame.url)) ??
  hit.frames.find((frame) => Boolean(frame.url)) ??
  hit.frames.find((frame) => frame.sourceSnippet);

const compactSourceFrames = (hit: PerfDomMutationBreakpointHit): PerfDomMutationSourceFrame[] => {
  return hit.frames.filter(
    (frame, frameIndex) =>
      frameIndex < PERF_DOM_BREAKPOINT_SINK_FRAME_LIMIT ||
      (Boolean(frame.url) && !isReactRenderingInternalFrame(frame)),
  );
};

const summarizeTopSources = (
  hits: PerfDomMutationBreakpointHit[],
  selectSourceFrame: (hit: PerfDomMutationBreakpointHit) => PerfDomMutationSourceFrame | undefined,
): PerfDomMutationTopSource[] => {
  const sourcesByLocation = new Map<string, MutableDomMutationTopSource>();
  for (const hit of hits) {
    const sourceFrame = selectSourceFrame(hit);
    if (!sourceFrame) continue;
    const sourceKey = `${sourceFrame.url}:${sourceFrame.lineNumber}:${sourceFrame.columnNumber}:${sourceFrame.functionName}`;
    const existingSource = sourcesByLocation.get(sourceKey);
    if (existingSource) {
      existingSource.hitCount += 1;
      existingSource.breakpointTypeSet.add(hit.breakpointType);
      continue;
    }
    sourcesByLocation.set(sourceKey, {
      functionName: sourceFrame.functionName,
      url: sourceFrame.url,
      lineNumber: sourceFrame.lineNumber,
      columnNumber: sourceFrame.columnNumber,
      sourceSnippet: sourceFrame.sourceSnippet,
      sourceMapped: sourceFrame.sourceMapped,
      hitCount: 1,
      breakpointTypes: [],
      breakpointTypeSet: new Set([hit.breakpointType]),
    });
  }
  return [...sourcesByLocation.values()]
    .sort((leftSource, rightSource) => rightSource.hitCount - leftSource.hitCount)
    .map((source) => ({
      functionName: source.functionName,
      url: source.url,
      lineNumber: source.lineNumber,
      columnNumber: source.columnNumber,
      sourceSnippet: source.sourceSnippet,
      sourceMapped: source.sourceMapped,
      hitCount: source.hitCount,
      breakpointTypes: [...source.breakpointTypeSet],
    }));
};

const removeBreakpoints = async (
  session: CDPSession,
  breakpoints: InstalledDomBreakpoint[],
): Promise<void> => {
  await Promise.allSettled(
    breakpoints.map((breakpoint) =>
      session.send("DOMDebugger.removeDOMBreakpoint", {
        nodeId: breakpoint.nodeId,
        type: breakpoint.type,
      }),
    ),
  );
};

export const captureDomMutationAttribution = async (
  page: Page,
  testInfo: TestInfo,
  scenarioName: string,
  packagePerfDirectory: string,
  targetSelectors: string[],
  scenarioBody: () => Promise<void>,
): Promise<PerfDomMutationAttributionReport> => {
  const warnings = [
    "DOM breakpoints pause JavaScript and are attribution evidence, never timing evidence",
  ];
  let session: CDPSession | null = null;
  let validityProbe: PerfRunValidityProbe | null = null;
  const installedBreakpoints: InstalledDomBreakpoint[] = [];
  const resolvedTargetSelectors: string[] = [];
  const hits: PerfDomMutationBreakpointHit[] = [];
  const scriptsById = new Map<string, DebuggerScriptParsedEvent>();
  let pendingPauseHandling = Promise.resolve();
  let debuggerPausedListener: ((event: DebuggerPausedEvent) => void) | null = null;
  let didReachHitLimit = false;
  try {
    session = await page.context().newCDPSession(page);
    const activeSession = session;
    activeSession.on("Debugger.scriptParsed", (event: DebuggerScriptParsedEvent) => {
      scriptsById.set(event.scriptId, event);
    });
    debuggerPausedListener = (event: DebuggerPausedEvent): void => {
      pendingPauseHandling = pendingPauseHandling.then(async () => {
        try {
          if (event.reason !== "DOM") return;
          if (hits.length >= PERF_DOM_BREAKPOINT_HIT_LIMIT) return;
          const data = event.data ?? {};
          const nodeIdValue = data.targetNodeId ?? data.nodeId;
          const nodeId = typeof nodeIdValue === "number" ? nodeIdValue : Number(nodeIdValue);
          let node: PerfDomMutationNode | undefined;
          if (Number.isFinite(nodeId) && nodeId > 0) {
            try {
              const response: DomDescribeNodeResponse = await activeSession.send(
                "DOM.describeNode",
                { nodeId, depth: 0 },
              );
              node = {
                nodeId,
                backendNodeId: response.node.backendNodeId,
                nodeName: response.node.nodeName,
                selector: describeNodeSelector(response.node),
              };
            } catch {
              node = undefined;
            }
          }
          hits.push({
            breakpointType: String(data.type ?? "DOM"),
            insertion: typeof data.insertion === "boolean" ? data.insertion : undefined,
            node,
            frames: createSourceFrames(event),
          });
          if (hits.length >= PERF_DOM_BREAKPOINT_HIT_LIMIT) {
            didReachHitLimit = true;
            try {
              await activeSession.send("Debugger.setSkipAllPauses", { skip: true });
            } catch {
              warnings.push("Could not disable debugger pauses after reaching the hit limit");
            }
          }
        } finally {
          await activeSession.send("Debugger.resume").catch(() => {});
        }
      });
    };
    activeSession.on("Debugger.paused", debuggerPausedListener);

    await activeSession.send("DOM.enable");
    await activeSession.send("Debugger.enable");
    await activeSession.send("Debugger.setAsyncCallStackDepth", {
      maxDepth: PERF_DOM_BREAKPOINT_ASYNC_STACK_DEPTH,
    });
    const documentResponse: DomDocumentResponse = await activeSession.send("DOM.getDocument", {
      depth: -1,
      pierce: true,
    });
    const documentElementResponse: DomQuerySelectorResponse = await activeSession.send(
      "DOM.querySelector",
      { nodeId: documentResponse.root.nodeId, selector: "html" },
    );
    if (documentElementResponse.nodeId > 0) {
      await activeSession.send("DOMDebugger.setDOMBreakpoint", {
        nodeId: documentElementResponse.nodeId,
        type: "subtree-modified",
      });
      installedBreakpoints.push({
        nodeId: documentElementResponse.nodeId,
        type: "subtree-modified",
      });
    }
    for (const selector of [...new Set(targetSelectors)]) {
      try {
        const response: DomQuerySelectorAllResponse = await activeSession.send(
          "DOM.querySelectorAll",
          {
            nodeId: documentResponse.root.nodeId,
            selector,
          },
        );
        if (response.nodeIds.length === 0) {
          warnings.push(`Could not resolve mutation target selector: ${selector}`);
          continue;
        }
        if (response.nodeIds.length > 1) {
          warnings.push(`Mutation target selector was not unique: ${selector}`);
          continue;
        }
        const nodeId = response.nodeIds[0];
        resolvedTargetSelectors.push(selector);
        const breakpointTypes: InstalledDomBreakpoint["type"][] = [
          "attribute-modified",
          "node-removed",
        ];
        for (const type of breakpointTypes) {
          await activeSession.send("DOMDebugger.setDOMBreakpoint", {
            nodeId,
            type,
          });
          installedBreakpoints.push({ nodeId, type });
        }
      } catch {
        warnings.push(`Could not resolve mutation target selector: ${selector}`);
      }
    }

    validityProbe = await startPerfRunValidityProbe(page);
    await scenarioBody();
    await pendingPauseHandling;
    const validity = await validityProbe.stop();
    validityProbe = null;
    await activeSession.send("Debugger.setSkipAllPauses", { skip: true });
    await removeBreakpoints(activeSession, installedBreakpoints);
    await activeSession.send("Debugger.resume").catch(() => {});
    await pendingPauseHandling;
    await activeSession.send("Debugger.setSkipAllPauses", { skip: false });
    await enrichSourceFrames(activeSession, hits, scriptsById, warnings);
    for (const hit of hits) hit.frames = compactSourceFrames(hit);
    const artifactName = `${scenarioName}.dom-mutation-attribution.json`;
    const report: PerfDomMutationAttributionReport = {
      available: true,
      intrusive: true,
      hitLimit: PERF_DOM_BREAKPOINT_HIT_LIMIT,
      hitLimitReached: didReachHitLimit,
      hitCount: hits.length,
      installedBreakpointCount: installedBreakpoints.length,
      requestedTargetSelectors: targetSelectors,
      resolvedTargetSelectors,
      topSources: summarizeTopSources(hits, selectApplicationSourceFrame),
      topMutationSinks: summarizeTopSources(hits, selectMutationSinkFrame),
      hits,
      validity,
      artifact: artifactName,
      warnings,
    };
    const runLabel = process.env.PERF_LABEL ?? "current";
    const labelDirectory = resolve(packagePerfDirectory, runLabel);
    const reportJson = JSON.stringify(report, null, 2);
    await mkdir(labelDirectory, { recursive: true });
    await writeFile(resolve(labelDirectory, artifactName), reportJson);
    await testInfo.attach(`perf-${artifactName}`, {
      body: reportJson,
      contentType: "application/json",
    });
    return report;
  } catch (captureError) {
    return {
      available: false,
      intrusive: true,
      hitLimit: PERF_DOM_BREAKPOINT_HIT_LIMIT,
      hitLimitReached: didReachHitLimit,
      hitCount: hits.length,
      installedBreakpointCount: installedBreakpoints.length,
      requestedTargetSelectors: targetSelectors,
      resolvedTargetSelectors,
      topSources: summarizeTopSources(hits, selectApplicationSourceFrame),
      topMutationSinks: summarizeTopSources(hits, selectMutationSinkFrame),
      hits,
      warnings,
      error: captureError instanceof Error ? captureError.message : String(captureError),
    };
  } finally {
    if (session) {
      if (debuggerPausedListener) session.off("Debugger.paused", debuggerPausedListener);
      await session.send("Debugger.setSkipAllPauses", { skip: true }).catch(() => {});
      await removeBreakpoints(session, installedBreakpoints);
      await session.send("Debugger.resume").catch(() => {});
      await pendingPauseHandling.catch(() => {});
      await session.send("Debugger.setSkipAllPauses", { skip: false }).catch(() => {});
    }
    if (validityProbe) await validityProbe.stop().catch(() => {});
    if (session) {
      await session.detach().catch(() => {});
    }
  }
};
