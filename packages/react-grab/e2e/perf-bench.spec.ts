// Perf benchmark suite. Runs under the `perf` Playwright project (see
// playwright.config.ts) via `pnpm test:perf`. Each scenario drives real
// user input and captures browser-native signals via the recorder
// installed by `perf-recorder.ts`: INP (Event Timing), LoAF, Long Tasks,
// frame deltas. For function-level attribution, run with `PERF_TRACE=1` —
// each scenario also dumps a Chrome trace JSON (load it via DevTools
// "Performance" panel; pair with `pnpm build:profiling` so symbols are
// unminified).
import { expect, test } from "./perf-fixtures.js";
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

// Perf scenarios are timing-sensitive — retries don't make a flaky
// measurement less flaky, they just waste minutes of CI. If a scenario
// throws, show it immediately; multi-sample averaging inside
// `recordScenario` is the right place to handle measurement variance.
test.describe.configure({ mode: "serial", retries: 0 });

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

  test("hover-over-animated-elements @perf", async ({ reactGrab, page }, testInfo) => {
    // Matches the laggy-on-real-sites case: hovering near CSS-animated
    // elements forces the freeze-pseudo-states + animation-finish paths
    // every time the detected element changes.
    const animatedSelectors = [
      "[data-testid='animated-pulse']",
      "[data-testid='animated-bounce']",
      "[data-testid='animated-spin']",
      "[data-testid='animated-section']",
      "[data-testid='gradient-div']",
    ];
    const hoverTargets: Array<{ x: number; y: number }> = [];
    for (const animatedSelector of animatedSelectors) {
      const locator = page.locator(animatedSelector).first();
      if ((await locator.count()) === 0) continue;
      const box = await locator.boundingBox();
      if (!box) continue;
      hoverTargets.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }
    if (hoverTargets.length === 0) {
      test.skip(true, "no animated targets in e2e-app");
      return;
    }

    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "hover-over-animated-elements",
      async () => {
        for (let passIndex = 0; passIndex < 30; passIndex++) {
          for (const target of hoverTargets) {
            await page.mouse.move(target.x, target.y, { steps: 2 });
            await page.waitForTimeout(20);
          }
        }
        await idleFrame(page, 4);
      },
    );
    await reactGrab.deactivate();
    logScenario("hover-over-animated-elements", aggregate);
  });

  test("arrow-key-tree-navigation @perf", async ({ reactGrab, page }, testInfo) => {
    // Activates the keyboard arrow-navigation menu and walks the DOM tree
    // up/down/left/right. Stresses the arrow-navigation logic + the
    // navigation menu render path.
    await reactGrab.activate();
    const startTarget = page.locator("[data-testid='nested-card']").first();
    if ((await startTarget.count()) === 0) {
      test.skip(true, "no nested-card target");
      return;
    }
    await startTarget.hover({ force: true });
    await page.waitForTimeout(200);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "arrow-key-tree-navigation",
      async () => {
        const arrowKeys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"] as const;
        for (let sequenceIndex = 0; sequenceIndex < 60; sequenceIndex++) {
          await page.keyboard.press(arrowKeys[sequenceIndex % arrowKeys.length]);
          await page.waitForTimeout(20);
        }
        await idleFrame(page, 4);
      },
    );
    await page.keyboard.press("Escape");
    logScenario("arrow-key-tree-navigation", aggregate);
  });

  test("context-menu-open-close-cycle @perf", async ({ reactGrab, page }, testInfo) => {
    // Right-click → context menu opens → escape closes. Each cycle
    // re-mounts the menu DOM, runs its dropdown-anchored positioning,
    // and re-runs deactivate cleanup on dismiss.
    const targetSelectors = [
      "[data-testid='todo-list'] li:nth-child(2)",
      "[data-testid='nested-card']",
      "[data-testid='span-element']",
      "[data-testid='td-1-2']",
    ];
    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "context-menu-open-close-cycle",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 30; cycleIndex++) {
          const elementLocator = page
            .locator(targetSelectors[cycleIndex % targetSelectors.length])
            .first();
          if ((await elementLocator.count()) === 0) continue;
          await elementLocator.click({ button: "right", force: true });
          await page.waitForTimeout(40);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
    );
    await reactGrab.deactivate();
    logScenario("context-menu-open-close-cycle", aggregate);
  });

  test("prompt-mode-typing @perf", async ({ reactGrab, page }, testInfo) => {
    // Enters prompt mode and types a paragraph. Exercises the textarea
    // auto-resize, reactive input signal, and per-keystroke memo
    // re-evaluation in the selection-label tree.
    await reactGrab.registerCommentAction();
    await reactGrab.enterPromptMode("[data-testid='span-element']");
    const promptText =
      "Refactor this component so the rendering logic is split from the data fetching layer, " +
      "and add a loading skeleton plus an error retry button.";

    const aggregate = await recordScenario(
      page,
      testInfo,
      "prompt-mode-typing",
      async () => {
        for (const character of promptText) {
          await page.keyboard.type(character);
          // Slow enough to capture per-keystroke INP but fast enough to
          // finish in a reasonable scenario duration.
          await page.waitForTimeout(8);
        }
        await idleFrame(page, 4);
      },
      // Typing 150 chars takes ~2s independent of system load — variance
      // is low, so one sample is enough and we save ~4s of CI time.
      { samples: 1 },
    );
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    logScenario("prompt-mode-typing", aggregate);
  });

  test("rapid-toggle-active-inactive @perf", async ({ reactGrab, page }, testInfo) => {
    // Just activate/deactivate via the API, no other interaction. Strips
    // away pointermove + hit-test noise so you see the bare activate /
    // deactivate cost (freeze-pseudo-states install/uninstall,
    // freeze-animations attach/remove, freezeUpdates pause/resume).
    void reactGrab; // fixture pre-loads the page
    const aggregate = await recordScenario(
      page,
      testInfo,
      "rapid-toggle-active-inactive",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 80; cycleIndex++) {
          await page.evaluate(() => window.__REACT_GRAB__?.activate?.());
          await idleFrame(page, 1);
          await page.evaluate(() => window.__REACT_GRAB__?.deactivate?.());
          await idleFrame(page, 1);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    logScenario("rapid-toggle-active-inactive", aggregate);
  });

  test("dom-mutation-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // Activates, then keeps adding/removing DOM nodes via the test app's
    // Add Element button. Tests the stale-element detection interval +
    // bounds-cache invalidation when the detected element disappears.
    await reactGrab.activate();
    const dynamicSection = page.locator("[data-testid='dynamic-section']").first();
    if ((await dynamicSection.count()) === 0) {
      test.skip(true, "no dynamic-section target");
      return;
    }
    const dynamicBox = await dynamicSection.boundingBox();
    if (!dynamicBox) {
      test.skip(true, "no dynamic-section bounds");
      return;
    }
    await page.mouse.move(dynamicBox.x + 20, dynamicBox.y + 20, { steps: 2 });
    await idleFrame(page, 2);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "dom-mutation-during-selection",
      async () => {
        const addButton = page.locator("[data-testid='add-element-button']").first();
        for (let cycleIndex = 0; cycleIndex < 25; cycleIndex++) {
          await addButton.click({ force: true });
          await page.waitForTimeout(20);
          const removeButton = page.locator("[data-testid^='remove-element-']").first();
          if ((await removeButton.count()) > 0) {
            await removeButton.click({ force: true });
            await page.waitForTimeout(20);
          }
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    await reactGrab.deactivate();
    logScenario("dom-mutation-during-selection", aggregate);
  });

  test("idle-after-activation @perf", async ({ reactGrab, page }, testInfo) => {
    // Sanity baseline: after activate, the library should do effectively
    // no work until a user gesture arrives. If a long task or LoAF shows
    // up here, something is polling/timer-ticking that shouldn't be.
    await reactGrab.activate();
    await idleFrame(page, 4);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "idle-after-activation",
      async () => {
        await page.waitForTimeout(2000);
      },
      // No user input + no library work — variance is approximately zero,
      // so one 2s sample is enough.
      { samples: 1 },
    );
    await reactGrab.deactivate();
    logScenario("idle-after-activation", aggregate);
  });

  test("large-drag-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // One huge drag rectangle covering ~half the perf grid. Stresses
    // getElementsInDrag's coverage sampling at the upper bound of
    // candidate count.
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "large-drag-selection", async () => {
      const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
      for (let dragIndex = 0; dragIndex < 8; dragIndex++) {
        await page.mouse.move(20, 80, { steps: 1 });
        await page.mouse.down();
        await page.mouse.move(viewport.width - 40, viewport.height - 40, { steps: 16 });
        await page.mouse.up();
        await page.waitForTimeout(80);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(40);
      }
      await idleFrame(page, 4);
    });
    logScenario("large-drag-selection", aggregate);
  });

  test("deep-element-stack-hover @perf", async ({ reactGrab, page, perfDom }, testInfo) => {
    // 2000 absolutely-positioned divs stacked at one point. Every hit-test
    // walks the full stack via elementsFromPoint + isValidGrabbableElement
    // filter — pathological case for large dense DOMs (per the comment
    // in pointer-events-freeze.ts about GitHub diff viewers).
    await perfDom.installDeepStack(2000);
    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "deep-element-stack-hover", async () => {
      // Wiggle the pointer inside the stack so each move counts as a new
      // detection (setPointer dedupes identical positions). 200 hit-tests,
      // each walking ~2000 stacked elements.
      for (let moveIndex = 0; moveIndex < 200; moveIndex++) {
        const x = 250 + (moveIndex % 11);
        const y = 250 + (moveIndex % 13);
        await page.mouse.move(x, y, { steps: 1 });
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
    logScenario("deep-element-stack-hover", aggregate);
  });

  // ─── DOM-density variants ──────────────────────────────────────────

  test("hover-dense-flat-dom @perf", async ({ reactGrab, page, perfDom }, testInfo) => {
    // 3000 small tiles across the viewport — each detection lands on a
    // different element, exercising bounds-cache + isValidGrabbableElement
    // filter at different DOM depths (vs. deep-element-stack-hover which
    // stacks them all at one point).
    await perfDom.installDenseFlat(3000);
    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "hover-dense-flat-dom", async () => {
      // Spiral across the dense grid hitting many distinct elements.
      for (let moveIndex = 0; moveIndex < 400; moveIndex++) {
        const radius = 50 + (moveIndex % 200);
        const angle = moveIndex * 0.13;
        await page.mouse.move(400 + Math.cos(angle) * radius, 300 + Math.sin(angle) * radius, {
          steps: 1,
        });
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
    logScenario("hover-dense-flat-dom", aggregate);
  });

  test("hover-deep-nested-dom @perf", async ({ reactGrab, page, perfDom }, testInfo) => {
    // 60-level deep nested divs with periodic transforms. Every detection
    // walks the chain via getAccumulatedTransform.
    // MAX_TRANSFORM_ANCESTOR_DEPTH=6 caps the walk; beyond that early-exit
    // kicks in, which is exactly what this measures.
    await perfDom.installDeepNested(60);
    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "hover-deep-nested-dom", async () => {
      // Many hovers near center of the nest — every detection walks
      // through the same deeply nested chain.
      for (let moveIndex = 0; moveIndex < 200; moveIndex++) {
        await page.mouse.move(400 + (moveIndex % 11), 400 + (moveIndex % 13), { steps: 1 });
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
    logScenario("hover-deep-nested-dom", aggregate);
  });

  // ─── Drag variants ─────────────────────────────────────────────────

  test("drag-with-autoscroll @perf", async ({ reactGrab, page }, testInfo) => {
    // Drag near the bottom viewport edge so AUTO_SCROLL_EDGE_THRESHOLD_PX
    // kicks in and autoScroller starts ticking. Exercises the rAF-driven
    // scroll path that runs concurrently with the drag.
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "drag-with-autoscroll", async () => {
      const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
      // Five long drags ending near the bottom edge so autoscroll engages
      // for the tail of each drag.
      for (let dragIndex = 0; dragIndex < 5; dragIndex++) {
        await page.mouse.move(60, 80, { steps: 1 });
        await page.mouse.down();
        await page.mouse.move(viewport.width - 60, viewport.height - 12, { steps: 30 });
        // Hold at the edge so autoscroll keeps firing.
        await page.waitForTimeout(400);
        await page.mouse.up();
        await page.waitForTimeout(80);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(40);
      }
      await idleFrame(page, 4);
    });
    logScenario("drag-with-autoscroll", aggregate);
  });

  test("drag-rapid-zigzag @perf", async ({ reactGrab, page }, testInfo) => {
    // Drag in a zigzag pattern with frequent direction changes — each
    // change recomputes the drag rectangle and dispatches new pointer
    // moves at full resolution.
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(page, testInfo, "drag-rapid-zigzag", async () => {
      for (let dragIndex = 0; dragIndex < 6; dragIndex++) {
        await page.mouse.move(200, 200, { steps: 1 });
        await page.mouse.down();
        for (let zigIndex = 0; zigIndex < 12; zigIndex++) {
          await page.mouse.move(200 + (zigIndex % 2 === 0 ? 400 : -50), 200 + zigIndex * 30, {
            steps: 4,
          });
        }
        await page.mouse.up();
        await page.waitForTimeout(60);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(40);
      }
      await idleFrame(page, 4);
    });
    logScenario("drag-rapid-zigzag", aggregate);
  });

  // ─── Copy / multi-select variants ──────────────────────────────────

  test("copy-multi-element-batch @perf", async ({ reactGrab, page }, testInfo) => {
    // Shift+click 20 elements then trigger copy via Cmd+Enter. Multi-
    // element copy fans out through clipboard payload aggregation +
    // per-element stack symbolication.
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );
    const gridPoints = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"))
        .slice(0, 20)
        .map((cell) => {
          const rect = cell.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }),
    );

    await reactGrab.activate();
    await idleFrame(page, 2);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "copy-multi-element-batch",
      async () => {
        await page.keyboard.down("Shift");
        for (const point of gridPoints) {
          await page.mouse.move(point.x, point.y, { steps: 1 });
          await page.mouse.click(point.x, point.y);
          await page.waitForTimeout(15);
        }
        await page.keyboard.up("Shift");
        await page.waitForTimeout(80);
        // Cmd/Ctrl+Enter triggers a copy of the multi-select.
        const modifierKey = process.platform === "darwin" ? "Meta" : "Control";
        await page.keyboard.press(`${modifierKey}+Enter`);
        await page.waitForTimeout(200);
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    await page.keyboard.press("Escape");
    logScenario("copy-multi-element-batch", aggregate);
  });

  // ─── Animation density ─────────────────────────────────────────────

  test("activate-with-many-animations @perf", async ({ page, perfDom }, testInfo) => {
    // 150 CSS-animated divs, then 20 activate/deactivate cycles. Isolates
    // the freeze-pseudo-states + freeze-animations + freezeUpdates
    // install/uninstall cost from pointer / detection noise.
    await perfDom.installCssAnimations(150);

    const aggregate = await recordScenario(
      page,
      testInfo,
      "activate-with-many-animations",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 20; cycleIndex++) {
          await page.evaluate(() => window.__REACT_GRAB__?.activate?.());
          await idleFrame(page, 1);
          await page.evaluate(() => window.__REACT_GRAB__?.deactivate?.());
          await idleFrame(page, 1);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    logScenario("activate-with-many-animations", aggregate);
  });

  test("deactivate-with-many-frozen-elements @perf", async ({ reactGrab, page }, testInfo) => {
    // Shift-click 15 elements (multi-freeze), then deactivate. Stresses
    // the bulk-unfreeze of frozen elements, frozenElementBoundsAccessors
    // teardown, and labelInstance fadeout.
    await page.goto(PERF_GRID_PATH);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-perf-row][data-perf-column]").length > 50,
      null,
      { timeout: 10_000 },
    );

    const aggregate = await recordScenario(
      page,
      testInfo,
      "deactivate-with-many-frozen-elements",
      async () => {
        const points = await page.evaluate(() =>
          Array.from(document.querySelectorAll("[data-perf-row][data-perf-column]"))
            .slice(0, 15)
            .map((cell) => {
              const rect = cell.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }),
        );
        for (let cycleIndex = 0; cycleIndex < 6; cycleIndex++) {
          await reactGrab.activate();
          await page.keyboard.down("Shift");
          for (const point of points) {
            await page.mouse.move(point.x, point.y, { steps: 1 });
            await page.mouse.click(point.x, point.y);
            await page.waitForTimeout(12);
          }
          await page.keyboard.up("Shift");
          await page.waitForTimeout(60);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(80);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    logScenario("deactivate-with-many-frozen-elements", aggregate);
  });

  // ─── Keyboard / menu paths ─────────────────────────────────────────

  test("context-menu-arrow-navigation @perf", async ({ reactGrab, page }, testInfo) => {
    // Open the context menu and walk its items via arrow keys. Each
    // press re-positions the menu-highlight and may scroll the menu.
    await reactGrab.activate();
    const target = page.locator("[data-testid='nested-card']").first();
    if ((await target.count()) === 0) {
      test.skip(true, "no nested-card target");
      return;
    }

    const aggregate = await recordScenario(
      page,
      testInfo,
      "context-menu-arrow-navigation",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 10; cycleIndex++) {
          await target.click({ button: "right", force: true });
          await page.waitForTimeout(60);
          for (let pressIndex = 0; pressIndex < 6; pressIndex++) {
            await page.keyboard.press(pressIndex % 2 === 0 ? "ArrowDown" : "ArrowUp");
            await page.waitForTimeout(16);
          }
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
    );
    await reactGrab.deactivate();
    logScenario("context-menu-arrow-navigation", aggregate);
  });

  test("keyboard-rapid-arrows @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection active, hammer arrow keys without entering arrow-nav
    // menu. Tests the keyboard-handler path's debounce + decision logic.
    await reactGrab.activate();
    await page.locator("[data-testid='nested-card']").first().hover({ force: true });
    await page.waitForTimeout(200);

    const aggregate = await recordScenario(page, testInfo, "keyboard-rapid-arrows", async () => {
      const arrowKeys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"] as const;
      for (let pressIndex = 0; pressIndex < 200; pressIndex++) {
        await page.keyboard.press(arrowKeys[pressIndex % arrowKeys.length]);
        await page.waitForTimeout(8);
      }
      await idleFrame(page, 4);
    });
    await page.keyboard.press("Escape");
    logScenario("keyboard-rapid-arrows", aggregate);
  });

  // ─── Toolbar interactions ──────────────────────────────────────────

  test("toolbar-drag-to-edges @perf", async ({ reactGrab, page }, testInfo) => {
    // Drag the toolbar to each of the 4 viewport edges (snap kicks in
    // each time). Stresses the toolbar drag physics + snap recalc.
    void reactGrab;
    const aggregate = await recordScenario(
      page,
      testInfo,
      "toolbar-drag-to-edges",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 5; cycleIndex++) {
          await reactGrab.dragToolbar(-400, -200);
          await reactGrab.dragToolbar(400, -200);
          await reactGrab.dragToolbar(400, 200);
          await reactGrab.dragToolbar(-400, 200);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    logScenario("toolbar-drag-to-edges", aggregate);
  });

  test("toolbar-collapse-expand-cycle @perf", async ({ reactGrab, page }, testInfo) => {
    // Rapid toolbar collapse + expand. Stresses the collapse animation
    // path that the AGENTS.md comment in constants.ts about
    // TOOLBAR_COLLAPSE_ANIMATION_DURATION_MS specifically calls out.
    void reactGrab;
    const aggregate = await recordScenario(
      page,
      testInfo,
      "toolbar-collapse-expand-cycle",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 15; cycleIndex++) {
          await reactGrab.clickToolbarCollapse();
          await page.waitForTimeout(120);
          await reactGrab.clickToolbarCollapse();
          await page.waitForTimeout(120);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    logScenario("toolbar-collapse-expand-cycle", aggregate);
  });

  // ─── Edge / integration ────────────────────────────────────────────

  test("dom-rerender-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection active, rapidly add and remove DOM nodes (React triggers
    // a re-render each time). Tests that selection bounds stay stable
    // while React is mutating the tree.
    await reactGrab.activate();
    const dynamicSection = page.locator("[data-testid='dynamic-section']").first();
    if ((await dynamicSection.count()) === 0) {
      test.skip(true, "no dynamic-section target");
      return;
    }
    const box = await dynamicSection.boundingBox();
    if (!box) {
      test.skip(true, "no dynamic-section bounds");
      return;
    }
    await page.mouse.move(box.x + 20, box.y + 20, { steps: 2 });

    const aggregate = await recordScenario(
      page,
      testInfo,
      "dom-rerender-during-selection",
      async () => {
        const addButton = page.locator("[data-testid='add-element-button']").first();
        // Burst: add 5 in a row, then remove all, repeat. Each add/remove
        // is a React render that recommits the section subtree.
        for (let burstIndex = 0; burstIndex < 10; burstIndex++) {
          for (let addIndex = 0; addIndex < 5; addIndex++) {
            await addButton.click({ force: true });
            await page.waitForTimeout(8);
          }
          let removeButton = page.locator("[data-testid^='remove-element-']").first();
          while ((await removeButton.count()) > 0) {
            await removeButton.click({ force: true });
            await page.waitForTimeout(6);
            removeButton = page.locator("[data-testid^='remove-element-']").first();
          }
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    await reactGrab.deactivate();
    logScenario("dom-rerender-during-selection", aggregate);
  });

  test("viewport-resize-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // Resize the viewport while a selection is active. Tests
    // viewport-version invalidation, bounds recompute, and the
    // resize-handler scaling of pointer coordinates.
    await reactGrab.activate();
    await page.locator("[data-testid='nested-card']").first().hover({ force: true });
    await page.waitForTimeout(200);

    const viewportSizes = [
      { width: 1024, height: 700 },
      { width: 1400, height: 900 },
      { width: 800, height: 600 },
      { width: 1280, height: 720 },
    ];
    const aggregate = await recordScenario(
      page,
      testInfo,
      "viewport-resize-during-selection",
      async () => {
        for (let cycleIndex = 0; cycleIndex < 15; cycleIndex++) {
          await page.setViewportSize(viewportSizes[cycleIndex % viewportSizes.length]);
          await page.waitForTimeout(80);
        }
        await idleFrame(page, 4);
      },
      // Each resize includes a fixed 80ms settle; the actual library work
      // is tiny relative to that, so 2 samples is plenty.
      { samples: 2 },
    );
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 720 });
    logScenario("viewport-resize-during-selection", aggregate);
  });
});
