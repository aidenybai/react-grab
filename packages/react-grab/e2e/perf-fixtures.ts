// Extends the base `reactGrab` fixture with `perfDom` — idempotent
// DOM-injection helpers (dense tile grid, deep chain, stacked elements,
// CSS animations) that auto-clean on test teardown.
import type { Page } from "@playwright/test";
import { test as reactGrabTest } from "./fixtures.js";

export const PERF_GRID_PATH = "/?perf=grid&rows=30&cols=10";
const PERF_GRID_SELECTOR = "[data-perf-row][data-perf-column]";
const PERF_GRID_READY_THRESHOLD = 50;

export const goToPerfGrid = async (page: Page): Promise<void> => {
  await page.goto(PERF_GRID_PATH);
  await page.waitForFunction(
    ({ selector, threshold }) => document.querySelectorAll(selector).length > threshold,
    { selector: PERF_GRID_SELECTOR, threshold: PERF_GRID_READY_THRESHOLD },
    { timeout: 10_000 },
  );
};

export interface PerfGridCenter {
  x: number;
  y: number;
}

export const getPerfGridCenters = (page: Page, sliceCount?: number): Promise<PerfGridCenter[]> =>
  page.evaluate(
    ({ selector, sliceTo }) => {
      const cells = Array.from(document.querySelectorAll(selector));
      const slice = sliceTo === undefined ? cells : cells.slice(0, sliceTo);
      return slice.map((cell) => {
        const rect = cell.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    },
    { selector: PERF_GRID_SELECTOR, sliceTo: sliceCount },
  );

export interface PerfDomHelpers {
  /** N small absolutely-positioned tiles in a sqrt(N)×sqrt(N) grid. */
  installDenseFlat(elementCount: number): Promise<void>;
  /** Single nested chain N levels deep, with periodic transforms. */
  installDeepNested(nestingDepth: number): Promise<void>;
  /** N CSS-animated divs (`rotate` and `pulse` keyframes). */
  installCssAnimations(animationCount: number): Promise<void>;
  /** N absolutely-positioned divs stacked at one point. */
  installDeepStack(stackDepth: number): Promise<void>;
}

const INSTALLER_REGISTRY: Record<keyof PerfDomHelpers, string> = {
  installDenseFlat: "perf-bench-dense-container",
  installDeepNested: "perf-bench-nested-root",
  installCssAnimations: "perf-bench-anim-container",
  installDeepStack: "perf-bench-stack-container",
};

export const test = reactGrabTest.extend<{ perfDom: PerfDomHelpers }>({
  perfDom: async ({ page }, use) => {
    const installedRootIds: string[] = [];
    const helpers: PerfDomHelpers = {
      async installDenseFlat(elementCount) {
        const containerId = INSTALLER_REGISTRY.installDenseFlat;
        installedRootIds.push(containerId);
        await page.evaluate(
          ({ containerIdRef, targetCount }) => {
            document.getElementById(containerIdRef)?.remove();
            const container = document.createElement("div");
            container.id = containerIdRef;
            container.style.cssText = "position:fixed;inset:0;pointer-events:auto;z-index:5;";
            const tileSize = Math.ceil(Math.sqrt(targetCount));
            for (let elementIndex = 0; elementIndex < targetCount; elementIndex++) {
              const tileColumn = elementIndex % tileSize;
              const tileRow = Math.floor(elementIndex / tileSize);
              const denseElement = document.createElement("div");
              denseElement.dataset.denseIndex = String(elementIndex);
              denseElement.style.cssText =
                `position:absolute;left:${tileColumn * 10}px;top:${tileRow * 10}px;` +
                `width:10px;height:10px;background:rgba(${elementIndex % 255},80,80,0.05);`;
              container.appendChild(denseElement);
            }
            document.body.appendChild(container);
          },
          { containerIdRef: containerId, targetCount: elementCount },
        );
      },
      async installDeepNested(nestingDepth) {
        const rootId = INSTALLER_REGISTRY.installDeepNested;
        installedRootIds.push(rootId);
        await page.evaluate(
          ({ rootIdRef, depth }) => {
            document.getElementById(rootIdRef)?.remove();
            const rootElement = document.createElement("div");
            rootElement.id = rootIdRef;
            rootElement.style.cssText =
              "position:fixed;top:200px;left:200px;width:400px;height:400px;";
            let cursorElement: HTMLElement = rootElement;
            for (let nestIndex = 0; nestIndex < depth; nestIndex++) {
              const innerElement = document.createElement("div");
              innerElement.dataset.nestLevel = String(nestIndex);
              // Sprinkled ancestor transforms keep the browser doing real
              // layout composition work so the chain isn't artificially flat.
              const hasTransform = nestIndex % 5 === 0;
              innerElement.style.cssText =
                `padding:2px;width:${400 - nestIndex * 2}px;height:${400 - nestIndex * 2}px;` +
                (hasTransform ? `transform:rotate(${nestIndex * 0.1}deg);` : "");
              cursorElement.appendChild(innerElement);
              cursorElement = innerElement;
            }
            document.body.appendChild(rootElement);
          },
          { rootIdRef: rootId, depth: nestingDepth },
        );
      },
      async installCssAnimations(animationCount) {
        const containerId = INSTALLER_REGISTRY.installCssAnimations;
        installedRootIds.push(containerId);
        installedRootIds.push("perf-bench-anim-style");
        await page.evaluate(
          ({ containerIdRef, count }) => {
            document.getElementById(containerIdRef)?.remove();
            document.getElementById("perf-bench-anim-style")?.remove();
            const styleNode = document.createElement("style");
            styleNode.id = "perf-bench-anim-style";
            styleNode.textContent = `
              @keyframes perf-bench-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes perf-bench-pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            `;
            document.head.appendChild(styleNode);
            const container = document.createElement("div");
            container.id = containerIdRef;
            container.style.cssText = "position:fixed;inset:0;pointer-events:none;";
            for (let animIndex = 0; animIndex < count; animIndex++) {
              const animatedElement = document.createElement("div");
              const animName = animIndex % 2 === 0 ? "perf-bench-rotate" : "perf-bench-pulse";
              animatedElement.style.cssText =
                `position:absolute;left:${(animIndex % 30) * 30}px;top:${Math.floor(animIndex / 30) * 30}px;` +
                `width:20px;height:20px;background:hsl(${animIndex * 7},70%,60%);` +
                `animation:${animName} 1s linear infinite;`;
              container.appendChild(animatedElement);
            }
            document.body.appendChild(container);
          },
          { containerIdRef: containerId, count: animationCount },
        );
      },
      async installDeepStack(stackDepth) {
        const containerId = INSTALLER_REGISTRY.installDeepStack;
        installedRootIds.push(containerId);
        await page.evaluate(
          ({ containerIdRef, depth }) => {
            document.getElementById(containerIdRef)?.remove();
            const stackContainer = document.createElement("div");
            stackContainer.id = containerIdRef;
            stackContainer.style.cssText =
              "position:fixed;top:200px;left:200px;width:200px;height:200px;z-index:50;";
            for (let stackIndex = 0; stackIndex < depth; stackIndex++) {
              const stackedElement = document.createElement("div");
              stackedElement.setAttribute("data-stack-index", String(stackIndex));
              // Slight per-element variation so the engine can't optimistically
              // dedupe computed styles.
              stackedElement.style.cssText = `position:absolute;inset:0;background:rgba(${stackIndex % 255},0,0,0.0005);`;
              stackContainer.appendChild(stackedElement);
            }
            document.body.appendChild(stackContainer);
          },
          { containerIdRef: containerId, depth: stackDepth },
        );
      },
    };
    await use(helpers);
    if (installedRootIds.length > 0 && !page.isClosed()) {
      try {
        await page.evaluate((cleanupIds) => {
          for (const cleanupId of cleanupIds) document.getElementById(cleanupId)?.remove();
        }, installedRootIds);
      } catch {
        // page may have already navigated; nothing to clean up.
      }
    }
  },
});

export { expect } from "@playwright/test";
