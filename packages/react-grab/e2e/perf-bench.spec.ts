// Perf benchmark suite. Runs under the `perf` Playwright project (see
// playwright.config.ts) via `pnpm test:perf`. Each scenario drives real
// user input and captures browser-native signals via the recorder
// installed by `perf-recorder.ts`: INP (Event Timing), LoAF, Long Tasks,
// frame deltas. For function-level attribution, run with `PERF_TRACE=1` —
// each scenario also dumps a Chrome trace JSON (load it via DevTools
// "Performance" panel; pair with `pnpm build:profiling` so symbols are
// unminified).
import { expect, test } from "./fixtures.js";
import { idleFrame, recordScenario, type PerfScenarioAggregate } from "./perf-recorder.js";

const PERF_GRID_PATH = "/?perf=grid&rows=30&cols=10";

// web-vitals "needs improvement" threshold is 200ms; we cap synthetic
// headless runs at 100ms so a real regression stands out from noise.
const INP_SOFT_LIMIT_MS = 100;

const logScenario = (scenarioName: string, aggregate: PerfScenarioAggregate): void => {
  // eslint-disable-next-line no-console
  console.log(
    `\n[perf] ${scenarioName}\n` +
      `  inp=${aggregate.inp}ms (${aggregate.interactions} interactions)  ` +
      `longTasks=${aggregate.longTasks.count}/${aggregate.longTasks.sum}ms (max ${aggregate.longTasks.max}ms)\n` +
      `  loaf=${aggregate.longAnimationFrames.count}/${aggregate.longAnimationFrames.sum}ms ` +
      `(max ${aggregate.longAnimationFrames.max}ms, blocking ${aggregate.longAnimationFrames.maxBlocking}ms)\n` +
      `  frames p50=${aggregate.frames.median}ms p95=${aggregate.frames.p95}ms max=${aggregate.frames.max}ms (${aggregate.frames.count} frames)`,
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

    const aggregate = await recordScenario(page, testInfo, "hover-in-selection-mode", async () => {
      for (const point of gridCells) {
        await page.mouse.move(point.x, point.y, { steps: 1 });
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
    logScenario("hover-in-selection-mode", aggregate);
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

    const aggregate = await recordScenario(
      page,
      testInfo,
      "pointermove-storm-synthetic",
      async () => {
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
      },
    );
    await reactGrab.deactivate();
    logScenario("pointermove-storm-synthetic", aggregate);
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

    const aggregate = await recordScenario(
      page,
      testInfo,
      "activate-click-copy-escape-cycle",
      async () => {
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
      },
    );
    logScenario("activate-click-copy-escape-cycle", aggregate);
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

    const aggregate = await recordScenario(
      page,
      testInfo,
      "copy-then-deactivate-stress",
      async () => {
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
          // Snapshot taken BEFORE the click is dispatched so the waiter
          // only matches the new copy's labelInstance, not the lingering
          // ~1.5s fade from the previous cycle (Bugbot caught this).
          // Polling `isCopying === true` was unreliable because the full
          // active → copying → justCopied transition can finish inside one
          // microtask, faster than `waitForFunction`'s default poll.
          const cycleStartTimestamp = await page.evaluate(() => Date.now());
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForFunction(
            (clickTimestamp) => {
              const instances = window.__REACT_GRAB__?.getState?.()?.labelInstances ?? [];
              return instances.some(
                (instance) =>
                  instance.createdAt >= clickTimestamp &&
                  (instance.status === "copied" || instance.status === "fading"),
              );
            },
            cycleStartTimestamp,
            { timeout: 2000 },
          );
          await page.keyboard.press("Escape");
          await page.waitForTimeout(80);
        }
        await idleFrame(page, 4);
      },
    );
    logScenario("copy-then-deactivate-stress", aggregate);
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

    const aggregate = await recordScenario(page, testInfo, "shift-multi-select-burst", async () => {
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
    });
    logScenario("shift-multi-select-burst", aggregate);
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

    const aggregate = await recordScenario(page, testInfo, "drag-selection-sweep", async () => {
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
    });
    logScenario("drag-selection-sweep", aggregate);
  });

  test("scroll-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    await reactGrab.activate();
    await page.mouse.move(400, 300, { steps: 2 });
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "scroll-during-selection", async () => {
      for (let scrollIndex = 0; scrollIndex < 200; scrollIndex++) {
        const scrollDeltaY = scrollIndex % 2 === 0 ? 80 : -80;
        await page.mouse.wheel(0, scrollDeltaY);
        await page.waitForTimeout(12);
      }
      await idleFrame(page, 4);
    });
    await page.keyboard.press("Escape");
    logScenario("scroll-during-selection", aggregate);
  });
});
