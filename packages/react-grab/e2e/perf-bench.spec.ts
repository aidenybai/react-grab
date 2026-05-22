// Perf benchmark suite, integrated with the existing Playwright e2e
// infrastructure. Runs only under the `perf` project (see playwright.config.ts)
// — `pnpm test:perf`. Each scenario is a serial test that:
//
//   1. drives real user input through Playwright (Event Timing API records it),
//   2. captures `rg:*` measures + INP + LoAF + long tasks + frame deltas via
//      the in-page recorder installed by `e2e/perf-recorder.ts`,
//   3. attaches the aggregated JSON to the Playwright report
//      (`test-results/<test>/perf-<scenario>.json`),
//   4. soft-asserts thresholds so regressions surface in CI without making
//      the suite red on noisy single runs.
//
// Run `pnpm test:perf:compare -- --grep "<scenario>"` against a baseline
// attachment to gate specific scenarios in CI.
import { expect, test } from "./fixtures.js";
import {
  aggregateRawSnapshot,
  attachPerfReport,
  idleFrame,
  startRecording,
  stopRecording,
  type PerfScenarioAggregate,
  type PerfStatsSummary,
} from "./perf-recorder.js";

const PERF_GRID_PATH = "/?perf=grid&rows=30&cols=10";

// Web Vitals "needs improvement" threshold for INP is 200ms. We keep the
// soft cap a bit tighter because these scenarios are synthetic and headless,
// so anything > 100ms suggests a real regression rather than noise.
const INP_SOFT_LIMIT_MS = 100;
// frame budget at 60fps is 16.7ms; a stale frame > 50ms is a clear hitch.
const MAX_FRAME_DELTA_SOFT_LIMIT_MS = 50;

const printScenarioSummary = (scenarioName: string, aggregate: PerfScenarioAggregate): void => {
  const measureEntries: Array<[string, PerfStatsSummary]> = Object.entries(aggregate.measures);
  const measureLines = measureEntries
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(
      ([measureName, measureStats]) =>
        `    rg:${measureName} x${measureStats.count}  p50=${measureStats.median.toFixed(3)}ms  p95=${measureStats.p95.toFixed(3)}ms  max=${measureStats.max.toFixed(3)}ms`,
    );
  // eslint-disable-next-line no-console
  console.log(
    [
      `\n[perf] ${scenarioName}`,
      `  inp=${aggregate.inp.toFixed(2)}ms  interactions=${aggregate.interactions}  ` +
        `longTasks=${aggregate.longTasks.count}/${aggregate.longTasks.sum.toFixed(2)}ms (max ${aggregate.longTasks.max.toFixed(2)}ms)`,
      `  loaf=${aggregate.longAnimationFrames.count}/${aggregate.longAnimationFrames.sum.toFixed(2)}ms ` +
        `(max ${aggregate.longAnimationFrames.maxDuration.toFixed(2)}ms, blocking ${aggregate.longAnimationFrames.maxBlockingDuration.toFixed(2)}ms)`,
      `  frames count=${aggregate.frames.count} p50=${aggregate.frames.median.toFixed(2)}ms p95=${aggregate.frames.p95.toFixed(2)}ms max=${aggregate.frames.max.toFixed(2)}ms`,
      ...measureLines,
    ].join("\n"),
  );
};

test.describe.configure({ mode: "serial" });

test.describe("@perf benchmarks", () => {
  test("hover-in-selection-mode @perf", async ({ reactGrab, page }, testInfo) => {
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    const gridCells = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"))
        .slice(0, 500)
        .map((cell) => {
          const rect = cell.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }),
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    await startRecording(page);

    for (const point of gridCells) {
      await page.mouse.move(point.x, point.y, { steps: 1 });
    }
    await idleFrame(page, 4);

    const rawSnapshot = await stopRecording(page);
    await reactGrab.deactivate();

    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "hover-in-selection-mode", aggregate, rawSnapshot);
    printScenarioSummary("hover-in-selection-mode", aggregate);

    expect.soft(aggregate.frames.max).toBeLessThan(MAX_FRAME_DELTA_SOFT_LIMIT_MS);
  });

  test("pointermove-storm-synthetic @perf", async ({ reactGrab, page }, testInfo) => {
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    await startRecording(page);
    await page.evaluate(async () => {
      const cells = Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"));
      const stormSize = 10_000;
      for (let stormIndex = 0; stormIndex < stormSize; stormIndex++) {
        const cell = cells[stormIndex % cells.length];
        const rect = cell.getBoundingClientRect();
        cell.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
          }),
        );
        if (stormIndex % 256 === 255) {
          await new Promise((resolveTimer) => requestAnimationFrame(() => resolveTimer(null)));
        }
      }
    });
    await idleFrame(page, 4);
    const rawSnapshot = await stopRecording(page);
    await reactGrab.deactivate();

    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "pointermove-storm-synthetic", aggregate, rawSnapshot);
    printScenarioSummary("pointermove-storm-synthetic", aggregate);
  });

  test("activate-click-copy-escape-cycle @perf", async ({ reactGrab, page }, testInfo) => {
    const elementSelectors = [
      "[data-testid='todo-list'] li:nth-child(1) span",
      "[data-testid='todo-list'] li:nth-child(3) span",
      "[data-testid='nested-button']",
      "[data-testid='span-element']",
      "[data-testid='code-element']",
      "[data-testid='td-1-2']",
    ];

    await startRecording(page);

    for (let cycleIndex = 0; cycleIndex < 30; cycleIndex++) {
      const elementSelector = elementSelectors[cycleIndex % elementSelectors.length];
      const elementLocator = page.locator(elementSelector).first();
      if ((await elementLocator.count()) === 0) continue;
      const boundingBox = await elementLocator.boundingBox();
      if (!boundingBox) continue;
      await reactGrab.activate();
      const targetCenterX = boundingBox.x + boundingBox.width / 2;
      const targetCenterY = boundingBox.y + boundingBox.height / 2;
      await page.mouse.move(targetCenterX, targetCenterY, { steps: 3 });
      await page.mouse.click(targetCenterX, targetCenterY);
      await page.waitForTimeout(80);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(60);
    }
    await idleFrame(page, 4);

    const rawSnapshot = await stopRecording(page);
    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "activate-click-copy-escape-cycle", aggregate, rawSnapshot);
    printScenarioSummary("activate-click-copy-escape-cycle", aggregate);

    expect.soft(aggregate.inp).toBeLessThan(INP_SOFT_LIMIT_MS);
  });

  test("copy-then-deactivate-stress @perf", async ({ reactGrab, page }, testInfo) => {
    const elementSelectors = [
      "[data-testid='todo-list'] li:nth-child(1)",
      "[data-testid='nested-card']",
      "[data-testid='span-element']",
      "[data-testid='strong-element']",
      "[data-testid='code-element']",
    ];

    await startRecording(page);

    for (let cycleIndex = 0; cycleIndex < 20; cycleIndex++) {
      const elementSelector = elementSelectors[cycleIndex % elementSelectors.length];
      const elementLocator = page.locator(elementSelector).first();
      if ((await elementLocator.count()) === 0) continue;
      const boundingBox = await elementLocator.boundingBox();
      if (!boundingBox) continue;
      await reactGrab.activate();
      await page.mouse.move(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2,
        { steps: 2 },
      );
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForFunction(
        () => {
          const reactGrabApi = window.__REACT_GRAB__;
          const apiState = reactGrabApi?.getState?.();
          return Boolean(
            apiState && (apiState.isCopying === false || (apiState.labelInstances?.length ?? 0)),
          );
        },
        null,
        { timeout: 2000 },
      );
      await page.waitForTimeout(120);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
    await idleFrame(page, 4);

    const rawSnapshot = await stopRecording(page);
    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "copy-then-deactivate-stress", aggregate, rawSnapshot);
    printScenarioSummary("copy-then-deactivate-stress", aggregate);

    expect.soft(aggregate.inp).toBeLessThan(INP_SOFT_LIMIT_MS);
  });

  test("shift-multi-select-burst @perf", async ({ reactGrab, page }, testInfo) => {
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    const gridCells = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"))
        .slice(0, 8)
        .map((cell) => {
          const rect = cell.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }),
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    await startRecording(page);

    await page.keyboard.down("Shift");
    for (const point of gridCells) {
      await page.mouse.move(point.x, point.y, { steps: 1 });
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(20);
    }
    await page.keyboard.up("Shift");
    await page.waitForTimeout(80);
    await page.keyboard.press("Escape");
    await idleFrame(page, 4);

    const rawSnapshot = await stopRecording(page);
    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "shift-multi-select-burst", aggregate, rawSnapshot);
    printScenarioSummary("shift-multi-select-burst", aggregate);
  });

  test("drag-selection-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    const gridCells = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]")).map((cell) => {
        const rect = cell.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }),
    );
    if (gridCells.length < 30) {
      test.skip(true, "perf grid has fewer than 30 cells");
      return;
    }

    await reactGrab.activate();
    await idleFrame(page, 2);

    await startRecording(page);

    for (let dragIndex = 0; dragIndex < 20; dragIndex++) {
      const startCell = gridCells[(dragIndex * 5) % gridCells.length];
      const endCell = gridCells[(dragIndex * 5 + 12) % gridCells.length];
      await page.mouse.move(startCell.x - 6, startCell.y - 6, { steps: 1 });
      await page.mouse.down();
      await page.mouse.move(endCell.x + 6, endCell.y + 6, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(60);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(40);
    }
    await idleFrame(page, 4);

    const rawSnapshot = await stopRecording(page);
    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "drag-selection-sweep", aggregate, rawSnapshot);
    printScenarioSummary("drag-selection-sweep", aggregate);
  });

  test("scroll-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    await reactGrab.activate();
    await page.mouse.move(400, 300, { steps: 2 });
    await idleFrame(page, 2);

    await startRecording(page);

    for (let scrollIndex = 0; scrollIndex < 200; scrollIndex++) {
      const scrollDeltaY = scrollIndex % 2 === 0 ? 80 : -80;
      await page.mouse.wheel(0, scrollDeltaY);
      await page.waitForTimeout(12);
    }
    await idleFrame(page, 4);

    const rawSnapshot = await stopRecording(page);
    await page.keyboard.press("Escape");

    const aggregate = aggregateRawSnapshot(rawSnapshot);
    await attachPerfReport(testInfo, "scroll-during-selection", aggregate, rawSnapshot);
    printScenarioSummary("scroll-during-selection", aggregate);
  });
});
