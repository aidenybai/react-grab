"use client";

import { useEffect } from "react";
import {
  registerPlugin,
  unregisterPlugin,
  type ToolbarEntry,
} from "react-grab";

const PLUGIN_NAME = "devtools-toolbar";

const ICON_RENDER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
const ICON_FPS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

interface RenderRecord {
  componentName: string;
  count: number;
  lastTimestamp: number;
}

const createRenderMonitorEntry = (): ToolbarEntry => {
  const renderCounts = new Map<string, RenderRecord>();
  let totalRenderCount = 0;
  let isMonitoring = false;
  let patchedRoots = new WeakSet<object>();

  const getComponentName = (fiber: { type?: unknown; elementType?: unknown }): string | null => {
    const type = fiber.type ?? fiber.elementType;
    if (!type) return null;
    if (typeof type === "string") return null;
    if (typeof type === "function") return (type as { displayName?: string }).displayName ?? type.name ?? null;
    if (typeof type === "object" && type !== null) {
      const objectType = type as Record<string, unknown>;
      if (objectType.displayName) return objectType.displayName as string;
      if (objectType.render && typeof objectType.render === "function") {
        const renderFunction = objectType.render as { displayName?: string; name?: string };
        return renderFunction.displayName ?? renderFunction.name ?? null;
      }
    }
    return null;
  };

  const traverseFiber = (fiber: { child?: unknown; sibling?: unknown; type?: unknown; elementType?: unknown; alternate?: unknown; stateNode?: unknown } | null | undefined) => {
    if (!fiber) return;
    const componentName = getComponentName(fiber as { type?: unknown; elementType?: unknown });
    if (componentName) {
      const existing = renderCounts.get(componentName);
      if (existing) {
        existing.count++;
        existing.lastTimestamp = performance.now();
      } else {
        renderCounts.set(componentName, {
          componentName,
          count: 1,
          lastTimestamp: performance.now(),
        });
      }
      totalRenderCount++;
    }
    traverseFiber(fiber.child as typeof fiber);
    traverseFiber(fiber.sibling as typeof fiber);
  };

  const startMonitoring = (handle: { setBadge: (badge: string | number | undefined) => void }) => {
    if (isMonitoring) return;
    isMonitoring = true;
    renderCounts.clear();
    totalRenderCount = 0;

    const hook = (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ as {
      onCommitFiberRoot?: (
        rendererID: number,
        fiberRoot: { current?: unknown },
      ) => void;
      _originalOnCommitFiberRoot?: typeof Function.prototype;
    } | undefined;

    if (!hook) return;

    if (!hook._originalOnCommitFiberRoot) {
      hook._originalOnCommitFiberRoot = hook.onCommitFiberRoot as typeof Function.prototype;
    }

    const originalOnCommit = hook._originalOnCommitFiberRoot;

    hook.onCommitFiberRoot = (rendererID: number, fiberRoot: { current?: unknown }) => {
      if (typeof originalOnCommit === "function") {
        originalOnCommit.call(hook, rendererID, fiberRoot);
      }

      if (!isMonitoring) return;
      if (patchedRoots.has(fiberRoot)) return;

      traverseFiber(fiberRoot.current as Parameters<typeof traverseFiber>[0]);
      handle.setBadge(totalRenderCount);
    };
  };

  const stopMonitoring = () => {
    isMonitoring = false;
    patchedRoots = new WeakSet<object>();
    const hook = (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ as {
      onCommitFiberRoot?: unknown;
      _originalOnCommitFiberRoot?: typeof Function.prototype;
    } | undefined;
    if (hook?._originalOnCommitFiberRoot) {
      hook.onCommitFiberRoot = hook._originalOnCommitFiberRoot as typeof hook.onCommitFiberRoot;
    }
  };

  return {
    id: "render-monitor",
    icon: ICON_RENDER,
    tooltip: "Render Monitor",
    onClick: (handle) => {
      if (isMonitoring) {
        stopMonitoring();
        handle.setBadge(undefined);
        handle.setIcon(ICON_RENDER);
      } else {
        startMonitoring(handle);
        handle.setIcon(
          ICON_RENDER.replace('stroke="currentColor"', 'stroke="#e53e3e"'),
        );
      }
    },
    onRender: (container, handle) => {
      const renderDropdownContent = () => {
        const sorted = [...renderCounts.values()].sort(
          (first, second) => second.count - first.count,
        );
        const topComponents = sorted.slice(0, 10);

        const rows = topComponents
          .map((record) => {
            const barWidthPercent =
              sorted.length > 0
                ? Math.round((record.count / sorted[0].count) * 100)
                : 0;
            return `
            <div style="display:flex;align-items:center;gap:8px;padding:2px 0">
              <span style="flex:1;font-size:12px;font-family:ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px" title="${record.componentName}">${record.componentName}</span>
              <div style="flex:1;height:4px;background:#eee;border-radius:2px;overflow:hidden">
                <div style="width:${barWidthPercent}%;height:100%;background:#e53e3e;border-radius:2px"></div>
              </div>
              <span style="font-size:11px;color:#666;min-width:24px;text-align:right;font-variant-numeric:tabular-nums">${record.count}</span>
            </div>`;
          })
          .join("");

        container.innerHTML = `
          <div style="padding:12px;min-width:240px;max-width:280px;color:black;font-family:system-ui,sans-serif">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <strong style="font-size:13px">Render Monitor</strong>
              <div style="display:flex;gap:4px">
                <button id="toggle-btn" style="cursor:pointer;padding:2px 8px;border:1px solid #ddd;border-radius:4px;background:${isMonitoring ? "#fee2e2" : "white"};font-size:11px">${isMonitoring ? "Stop" : "Start"}</button>
                <button id="clear-btn" style="cursor:pointer;padding:2px 8px;border:1px solid #ddd;border-radius:4px;background:white;font-size:11px">Clear</button>
              </div>
            </div>
            <div style="font-size:11px;color:#888;margin-bottom:6px">${totalRenderCount} total renders</div>
            ${topComponents.length > 0 ? rows : '<div style="font-size:12px;color:#aaa;text-align:center;padding:12px 0">No renders recorded.<br/>Click Start to begin.</div>'}
          </div>
        `;

        container.querySelector("#toggle-btn")?.addEventListener("click", () => {
          if (isMonitoring) {
            stopMonitoring();
            handle.setBadge(undefined);
            handle.setIcon(ICON_RENDER);
          } else {
            startMonitoring(handle);
            handle.setIcon(
              ICON_RENDER.replace('stroke="currentColor"', 'stroke="#e53e3e"'),
            );
          }
          renderDropdownContent();
        });

        container.querySelector("#clear-btn")?.addEventListener("click", () => {
          renderCounts.clear();
          totalRenderCount = 0;
          handle.setBadge(undefined);
          renderDropdownContent();
        });
      };

      renderDropdownContent();

      const refreshInterval = setInterval(() => {
        if (!isMonitoring) return;
        renderDropdownContent();
      }, 1000);

      return () => clearInterval(refreshInterval);
    },
  };
};

const createFpsMonitorEntry = (): ToolbarEntry => {
  let isRunning = false;
  let animationFrameId: number | null = null;
  let lastFrameTimestamp = 0;
  let frameTimestamps: number[] = [];
  let currentFps = 0;
  let minFps = Infinity;
  let maxFps = 0;
  let longFrameCount = 0;
  let fpsHistory: number[] = [];

  const FPS_HISTORY_LENGTH = 60;
  const LONG_FRAME_THRESHOLD_MS = 33.33;

  const measureFrame = (
    timestamp: number,
    handle: { setBadge: (badge: string | number | undefined) => void },
  ) => {
    if (!isRunning) return;

    if (lastFrameTimestamp > 0) {
      const frameDurationMs = timestamp - lastFrameTimestamp;
      frameTimestamps.push(timestamp);

      if (frameDurationMs > LONG_FRAME_THRESHOLD_MS) {
        longFrameCount++;
      }

      const oneSecondAgo = timestamp - 1000;
      frameTimestamps = frameTimestamps.filter(
        (frameTime) => frameTime > oneSecondAgo,
      );
      currentFps = frameTimestamps.length;

      if (currentFps > 0) {
        minFps = Math.min(minFps, currentFps);
        maxFps = Math.max(maxFps, currentFps);
      }

      fpsHistory.push(currentFps);
      if (fpsHistory.length > FPS_HISTORY_LENGTH) {
        fpsHistory = fpsHistory.slice(-FPS_HISTORY_LENGTH);
      }

      handle.setBadge(currentFps);
    }

    lastFrameTimestamp = timestamp;
    animationFrameId = requestAnimationFrame((nextTimestamp) =>
      measureFrame(nextTimestamp, handle),
    );
  };

  const startMeasuring = (handle: {
    setBadge: (badge: string | number | undefined) => void;
  }) => {
    if (isRunning) return;
    isRunning = true;
    frameTimestamps = [];
    currentFps = 0;
    minFps = Infinity;
    maxFps = 0;
    longFrameCount = 0;
    fpsHistory = [];
    lastFrameTimestamp = 0;
    animationFrameId = requestAnimationFrame((timestamp) =>
      measureFrame(timestamp, handle),
    );
  };

  const stopMeasuring = () => {
    isRunning = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  return {
    id: "fps-monitor",
    icon: ICON_FPS,
    tooltip: "FPS Monitor",
    onClick: (handle) => {
      if (isRunning) {
        stopMeasuring();
        handle.setBadge(undefined);
        handle.setIcon(ICON_FPS);
      } else {
        startMeasuring(handle);
        handle.setIcon(
          ICON_FPS.replace('stroke="currentColor"', 'stroke="#38a169"'),
        );
      }
    },
    onRender: (container, handle) => {
      const renderDropdownContent = () => {
        const avgFps =
          fpsHistory.length > 0
            ? Math.round(
                fpsHistory.reduce((sum, fps) => sum + fps, 0) /
                  fpsHistory.length,
              )
            : 0;

        const sparklineHeight = 32;
        const sparklineWidth = 180;
        const maxFpsForScale = Math.max(...fpsHistory, 60);
        const sparklinePoints = fpsHistory
          .map((fps, index) => {
            const x = (index / (FPS_HISTORY_LENGTH - 1)) * sparklineWidth;
            const y =
              sparklineHeight - (fps / maxFpsForScale) * sparklineHeight;
            return `${x},${y}`;
          })
          .join(" ");

        const fpsColor =
          currentFps >= 55 ? "#38a169" : currentFps >= 30 ? "#d69e2e" : "#e53e3e";

        container.innerHTML = `
          <div style="padding:12px;min-width:220px;color:black;font-family:system-ui,sans-serif">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <strong style="font-size:13px">FPS Monitor</strong>
              <div style="display:flex;gap:4px">
                <button id="toggle-btn" style="cursor:pointer;padding:2px 8px;border:1px solid #ddd;border-radius:4px;background:${isRunning ? "#f0fff4" : "white"};font-size:11px">${isRunning ? "Stop" : "Start"}</button>
              </div>
            </div>
            ${
              isRunning || fpsHistory.length > 0
                ? `
              <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px">
                <span style="font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;color:${fpsColor}">${currentFps}</span>
                <span style="font-size:12px;color:#888">FPS</span>
              </div>
              <svg width="${sparklineWidth}" height="${sparklineHeight}" style="margin-bottom:8px;display:block">
                <line x1="0" y1="${sparklineHeight - (60 / maxFpsForScale) * sparklineHeight}" x2="${sparklineWidth}" y2="${sparklineHeight - (60 / maxFpsForScale) * sparklineHeight}" stroke="#eee" stroke-width="1" stroke-dasharray="4"/>
                ${fpsHistory.length > 1 ? `<polyline points="${sparklinePoints}" fill="none" stroke="${fpsColor}" stroke-width="1.5"/>` : ""}
              </svg>
              <div style="display:flex;gap:12px;font-size:11px;color:#666">
                <span>Min <strong style="color:black">${minFps === Infinity ? "-" : minFps}</strong></span>
                <span>Avg <strong style="color:black">${avgFps || "-"}</strong></span>
                <span>Max <strong style="color:black">${maxFps || "-"}</strong></span>
                <span>Drops <strong style="color:${longFrameCount > 0 ? "#e53e3e" : "black"}">${longFrameCount}</strong></span>
              </div>
            `
                : '<div style="font-size:12px;color:#aaa;text-align:center;padding:12px 0">Click Start to begin measuring.</div>'
            }
          </div>
        `;

        container.querySelector("#toggle-btn")?.addEventListener("click", () => {
          if (isRunning) {
            stopMeasuring();
            handle.setBadge(undefined);
            handle.setIcon(ICON_FPS);
          } else {
            startMeasuring(handle);
            handle.setIcon(
              ICON_FPS.replace('stroke="currentColor"', 'stroke="#38a169"'),
            );
          }
          renderDropdownContent();
        });
      };

      renderDropdownContent();

      const refreshInterval = setInterval(renderDropdownContent, 500);

      return () => {
        clearInterval(refreshInterval);
      };
    },
  };
};

export function ToolbarEntriesProvider() {
  useEffect(() => {
    registerPlugin({
      name: PLUGIN_NAME,
      toolbarEntries: [createRenderMonitorEntry(), createFpsMonitorEntry()],
    });

    return () => {
      unregisterPlugin(PLUGIN_NAME);
    };
  }, []);

  return null;
}
