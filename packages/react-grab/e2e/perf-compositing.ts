import type { CDPSession } from "@playwright/test";
import {
  PERF_COMPOSITED_LAYER_LIMIT,
  PERF_MILLISECONDS_PER_SECOND,
  PERF_PAINT_PROFILE_COMMAND_LIMIT,
  PERF_PAINT_PROFILE_LAYER_LIMIT,
  PERF_PAINT_PROFILE_MIN_DURATION_SECONDS,
  PERF_PAINT_PROFILE_MIN_REPEAT_COUNT,
  PERF_PERCENT_SCALE,
} from "./perf-constants.js";

export interface PerfCompositedLayer {
  layerId: string;
  parentLayerId?: string;
  backendNodeId?: number;
  target: string;
  widthPx: number;
  heightPx: number;
  areaPx: number;
  viewportCoveragePercent: number;
  clippedViewportCoveragePercent: number;
  paintCount: number;
  drawsContent: boolean;
  invisible: boolean;
  compositingReasons: string[];
  compositingReasonIds: string[];
}

export interface PerfCompositingSummary {
  available: boolean;
  layerTreeChangeCount: number;
  uniqueLayerCount: number;
  newLayerCount: number;
  removedLayerCount: number;
  maximumLayerCount: number;
  maximumContentLayerCount: number;
  maximumContentAreaViewportMultiple: number;
  maximumClippedContentAreaViewportMultiple: number;
  layerPaintCountDelta: number;
  paintEventCount: number;
  paintedAreaViewportMultiple: number;
  largestPaintViewportPercent: number;
  topLayers: PerfCompositedLayer[];
  paintProfiles: PerfLayerPaintProfile[];
  warnings: string[];
  error?: string;
}

export interface PerfPaintCommandSummary {
  method: string;
  count: number;
}

export interface PerfLayerPaintProfile {
  layerId: string;
  target: string;
  commandCount: number;
  profileRunCount: number;
  meanReplayDurationMs: number;
  topCommands: PerfPaintCommandSummary[];
}

export interface PerfCompositingProbe {
  stop(): Promise<PerfCompositingSummary>;
}

interface ProtocolLayer {
  layerId: string;
  parentLayerId?: string;
  backendNodeId?: number;
  width: number;
  height: number;
  paintCount?: number;
  drawsContent: boolean;
  invisible?: boolean;
}

interface LayerTreeDidChangeEvent {
  layers?: ProtocolLayer[];
}

interface LayerPaintedEvent {
  layerId: string;
  clip: {
    width: number;
    height: number;
  };
}

interface CompositingReasonsResponse {
  compositingReasons: string[];
  compositingReasonIds: string[];
}

interface DescribeNodeResponse {
  node: {
    nodeName: string;
    pseudoType?: string;
    attributes?: string[];
  };
}

interface MakeSnapshotResponse {
  snapshotId: string;
}

interface SnapshotCommandLogResponse {
  commandLog: Record<string, unknown>[];
}

interface ProfileSnapshotResponse {
  timings: number[][];
}

const roundTo3 = (value: number): number => Number(value.toFixed(3));

const readAttribute = (attributes: string[] | undefined, name: string): string | undefined => {
  if (!attributes) return undefined;
  for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex += 2) {
    if (attributes[attributeIndex] === name) return attributes[attributeIndex + 1];
  }
  return undefined;
};

const describeLayerTarget = async (
  pageSession: CDPSession,
  backendNodeId: number | undefined,
): Promise<string> => {
  if (backendNodeId === undefined) return "(browser-generated layer)";
  try {
    const response: DescribeNodeResponse = await pageSession.send("DOM.describeNode", {
      backendNodeId,
      depth: 0,
      pierce: true,
    });
    const node = response.node;
    const elementName = node.nodeName.toLowerCase();
    const elementId = readAttribute(node.attributes, "id");
    const testId = readAttribute(node.attributes, "data-testid");
    const identity = elementId
      ? `${elementName}#${elementId}`
      : testId
        ? `${elementName}[data-testid="${testId}"]`
        : elementName;
    return `${identity}${node.pseudoType ? `::${node.pseudoType}` : ""}`;
  } catch {
    return `(backend node ${backendNodeId})`;
  }
};

const unavailableSummary = (error: string): PerfCompositingSummary => ({
  available: false,
  layerTreeChangeCount: 0,
  uniqueLayerCount: 0,
  newLayerCount: 0,
  removedLayerCount: 0,
  maximumLayerCount: 0,
  maximumContentLayerCount: 0,
  maximumContentAreaViewportMultiple: 0,
  maximumClippedContentAreaViewportMultiple: 0,
  layerPaintCountDelta: 0,
  paintEventCount: 0,
  paintedAreaViewportMultiple: 0,
  largestPaintViewportPercent: 0,
  topLayers: [],
  paintProfiles: [],
  warnings: [],
  error,
});

const captureLayerPaintProfile = async (
  pageSession: CDPSession,
  layer: ProtocolLayer,
  target: string,
): Promise<PerfLayerPaintProfile> => {
  const snapshot: MakeSnapshotResponse = await pageSession.send("LayerTree.makeSnapshot", {
    layerId: layer.layerId,
  });
  try {
    const commandLog: SnapshotCommandLogResponse = await pageSession.send(
      "LayerTree.snapshotCommandLog",
      { snapshotId: snapshot.snapshotId },
    );
    const profile: ProfileSnapshotResponse = await pageSession.send("LayerTree.profileSnapshot", {
      snapshotId: snapshot.snapshotId,
      minRepeatCount: PERF_PAINT_PROFILE_MIN_REPEAT_COUNT,
      minDuration: PERF_PAINT_PROFILE_MIN_DURATION_SECONDS,
    });
    const commandCountsByMethod = new Map<string, number>();
    for (const command of commandLog.commandLog) {
      const method = typeof command.method === "string" ? command.method : "(unknown command)";
      commandCountsByMethod.set(method, (commandCountsByMethod.get(method) ?? 0) + 1);
    }
    const replayDurationSeconds = profile.timings.reduce(
      (totalDuration, runTimings) =>
        totalDuration +
        runTimings.reduce((runDuration, commandDuration) => runDuration + commandDuration, 0),
      0,
    );
    return {
      layerId: layer.layerId,
      target,
      commandCount: commandLog.commandLog.length,
      profileRunCount: profile.timings.length,
      meanReplayDurationMs: roundTo3(
        (replayDurationSeconds / Math.max(profile.timings.length, 1)) *
          PERF_MILLISECONDS_PER_SECOND,
      ),
      topCommands: [...commandCountsByMethod]
        .sort((leftCommand, rightCommand) => rightCommand[1] - leftCommand[1])
        .slice(0, PERF_PAINT_PROFILE_COMMAND_LIMIT)
        .map(([method, count]) => ({ method, count })),
    };
  } finally {
    await pageSession.send("LayerTree.releaseSnapshot", { snapshotId: snapshot.snapshotId });
  }
};

export const startCompositingProbe = async (
  pageSession: CDPSession,
  viewportWidthPx: number,
  viewportHeightPx: number,
): Promise<PerfCompositingProbe> => {
  const viewportAreaPx = Math.max(viewportWidthPx * viewportHeightPx, 1);
  let latestLayers: ProtocolLayer[] = [];
  let initialLayerIds: Set<string> | undefined;
  const observedLayerIds = new Set<string>();
  const minimumPaintCountByLayerId = new Map<string, number>();
  const maximumPaintCountByLayerId = new Map<string, number>();
  let layerTreeChangeCount = 0;
  let maximumLayerCount = 0;
  let maximumContentLayerCount = 0;
  let maximumContentAreaViewportMultiple = 0;
  let maximumClippedContentAreaViewportMultiple = 0;
  let paintEventCount = 0;
  let paintedAreaPx = 0;
  let largestPaintAreaPx = 0;

  const handleLayerTreeChange = (event: LayerTreeDidChangeEvent): void => {
    if (!event.layers) return;
    latestLayers = event.layers;
    layerTreeChangeCount += 1;
    if (!initialLayerIds) initialLayerIds = new Set(event.layers.map((layer) => layer.layerId));
    maximumLayerCount = Math.max(maximumLayerCount, event.layers.length);
    let contentLayerCount = 0;
    let contentAreaPx = 0;
    let clippedContentAreaPx = 0;
    for (const layer of event.layers) {
      observedLayerIds.add(layer.layerId);
      if (layer.paintCount !== undefined) {
        minimumPaintCountByLayerId.set(
          layer.layerId,
          Math.min(
            minimumPaintCountByLayerId.get(layer.layerId) ?? layer.paintCount,
            layer.paintCount,
          ),
        );
        maximumPaintCountByLayerId.set(
          layer.layerId,
          Math.max(
            maximumPaintCountByLayerId.get(layer.layerId) ?? layer.paintCount,
            layer.paintCount,
          ),
        );
      }
      if (!layer.drawsContent || layer.invisible === true) continue;
      contentLayerCount += 1;
      const layerAreaPx = layer.width * layer.height;
      contentAreaPx += layerAreaPx;
      clippedContentAreaPx += Math.min(layerAreaPx, viewportAreaPx);
    }
    maximumContentLayerCount = Math.max(maximumContentLayerCount, contentLayerCount);
    maximumContentAreaViewportMultiple = Math.max(
      maximumContentAreaViewportMultiple,
      contentAreaPx / viewportAreaPx,
    );
    maximumClippedContentAreaViewportMultiple = Math.max(
      maximumClippedContentAreaViewportMultiple,
      clippedContentAreaPx / viewportAreaPx,
    );
  };

  const handleLayerPainted = (event: LayerPaintedEvent): void => {
    const paintAreaPx = event.clip.width * event.clip.height;
    paintEventCount += 1;
    paintedAreaPx += paintAreaPx;
    largestPaintAreaPx = Math.max(largestPaintAreaPx, paintAreaPx);
  };

  pageSession.on("LayerTree.layerTreeDidChange", handleLayerTreeChange);
  pageSession.on("LayerTree.layerPainted", handleLayerPainted);
  try {
    await pageSession.send("LayerTree.enable");
  } catch (enableError) {
    pageSession.off("LayerTree.layerTreeDidChange", handleLayerTreeChange);
    pageSession.off("LayerTree.layerPainted", handleLayerPainted);
    const error = enableError instanceof Error ? enableError.message : String(enableError);
    return { stop: async () => unavailableSummary(error) };
  }

  return {
    stop: async () => {
      pageSession.off("LayerTree.layerTreeDidChange", handleLayerTreeChange);
      pageSession.off("LayerTree.layerPainted", handleLayerPainted);
      if (latestLayers.length === 0) {
        try {
          await pageSession.send("LayerTree.disable");
        } catch {
          // The page can close while the best-effort layer summary is finalized.
        }
        return unavailableSummary("Chromium exposed no layer tree");
      }

      const currentLayerIds = new Set(latestLayers.map((layer) => layer.layerId));
      const initialIds = initialLayerIds ?? new Set<string>();
      const layerPaintCountDelta = [...maximumPaintCountByLayerId].reduce(
        (totalPaintCount, [layerId, maximumPaintCount]) =>
          totalPaintCount +
          Math.max(
            maximumPaintCount - (minimumPaintCountByLayerId.get(layerId) ?? maximumPaintCount),
            0,
          ),
        0,
      );
      const topProtocolLayers = [...latestLayers]
        .filter((layer) => layer.drawsContent)
        .sort(
          (leftLayer, rightLayer) =>
            rightLayer.width * rightLayer.height - leftLayer.width * leftLayer.height,
        )
        .slice(0, PERF_COMPOSITED_LAYER_LIMIT);
      const topLayers = await Promise.all(
        topProtocolLayers.map(async (layer): Promise<PerfCompositedLayer> => {
          let reasons: CompositingReasonsResponse = {
            compositingReasons: [],
            compositingReasonIds: [],
          };
          try {
            reasons = await pageSession.send("LayerTree.compositingReasons", {
              layerId: layer.layerId,
            });
          } catch {
            reasons = { compositingReasons: [], compositingReasonIds: [] };
          }
          const areaPx = layer.width * layer.height;
          return {
            layerId: layer.layerId,
            parentLayerId: layer.parentLayerId,
            backendNodeId: layer.backendNodeId,
            target: await describeLayerTarget(pageSession, layer.backendNodeId),
            widthPx: layer.width,
            heightPx: layer.height,
            areaPx,
            viewportCoveragePercent: roundTo3((areaPx / viewportAreaPx) * PERF_PERCENT_SCALE),
            clippedViewportCoveragePercent: roundTo3(
              (Math.min(areaPx, viewportAreaPx) / viewportAreaPx) * PERF_PERCENT_SCALE,
            ),
            paintCount: layer.paintCount ?? 0,
            drawsContent: layer.drawsContent,
            invisible: layer.invisible === true,
            compositingReasons: reasons.compositingReasons,
            compositingReasonIds: reasons.compositingReasonIds,
          };
        }),
      );
      const paintProfiles: PerfLayerPaintProfile[] = [];
      const warnings: string[] = [];
      for (const layer of topProtocolLayers) {
        if (paintProfiles.length >= PERF_PAINT_PROFILE_LAYER_LIMIT) break;
        const target = topLayers.find((topLayer) => topLayer.layerId === layer.layerId)?.target;
        try {
          paintProfiles.push(
            await captureLayerPaintProfile(
              pageSession,
              layer,
              target ?? `(layer ${layer.layerId})`,
            ),
          );
        } catch (profileError) {
          const message =
            profileError instanceof Error ? profileError.message : String(profileError);
          if (!message.includes("Layer does not produce picture")) {
            warnings.push(`Could not profile layer ${layer.layerId}: ${message}`);
          }
        }
      }
      try {
        await pageSession.send("LayerTree.disable");
      } catch {
        // The page can close while the best-effort layer summary is finalized.
      }

      return {
        available: true,
        layerTreeChangeCount,
        uniqueLayerCount: observedLayerIds.size,
        newLayerCount: [...observedLayerIds].filter((layerId) => !initialIds.has(layerId)).length,
        removedLayerCount: [...initialIds].filter((layerId) => !currentLayerIds.has(layerId))
          .length,
        maximumLayerCount,
        maximumContentLayerCount,
        maximumContentAreaViewportMultiple: roundTo3(maximumContentAreaViewportMultiple),
        maximumClippedContentAreaViewportMultiple: roundTo3(
          maximumClippedContentAreaViewportMultiple,
        ),
        layerPaintCountDelta,
        paintEventCount,
        paintedAreaViewportMultiple: roundTo3(paintedAreaPx / viewportAreaPx),
        largestPaintViewportPercent: roundTo3(
          (largestPaintAreaPx / viewportAreaPx) * PERF_PERCENT_SCALE,
        ),
        topLayers,
        paintProfiles,
        warnings,
      };
    },
  };
};
