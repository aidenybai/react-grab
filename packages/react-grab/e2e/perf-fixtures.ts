// Standard-shape Playwright fixtures for the @perf scenarios. Composes
// the base `reactGrab` fixture from `./fixtures.ts` with two perf-only
// fixtures:
//
//   - `perfDom`     – idempotent DOM-injection helpers that auto-clean
//                     on test teardown. Used by scenarios that need a
//                     specific DOM density / shape (dense flat tile,
//                     deep ancestor chain, stacked elements at one
//                     point, lots of CSS animations).
//   - `perfBaseline` – loads the committed `perf/baseline/<scenario>.json`
//                      for the current test, if present. Each scenario
//                      passes it back to `recordScenario({ baseline })`
//                      so the attached report carries both numbers and
//                      diffs are doable purely from the artifact.
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test as reactGrabTest } from "./fixtures.js";
import type { PerfScenarioAggregate } from "./perf-recorder.js";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_PERF_DIR = resolve(E2E_DIR, "../perf");

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

export const test = reactGrabTest.extend<{
  perfDom: PerfDomHelpers;
  perfBaseline: PerfScenarioAggregate | null;
}>({
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
              // Apply transforms to some ancestors so getAccumulatedTransform
              // has real work to do instead of no-ops.
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
  // playwright fixtures require an arg even when unused; first slot is
  // `{}` per the playwright convention.
  // eslint-disable-next-line no-empty-pattern
  perfBaseline: async ({}, use, testInfo) => {
    const scenarioName = testInfo.title.replace(/\s*@perf\s*$/, "").trim();
    const baselinePath = resolve(PACKAGE_PERF_DIR, "baseline", `${scenarioName}.json`);
    let baseline: PerfScenarioAggregate | null = null;
    try {
      const baselineRaw = await readFile(baselinePath, "utf8");
      const parsed = JSON.parse(baselineRaw) as { aggregate?: PerfScenarioAggregate };
      baseline = parsed.aggregate ?? null;
    } catch {
      // Either no baseline committed yet, or the file is malformed.
      // Tests handle null by not comparing — same as the no-baseline case.
    }
    await use(baseline);
  },
});

export { expect } from "@playwright/test";
