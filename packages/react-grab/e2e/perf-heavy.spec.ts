// Heavy real-world-UI perf suite. Complements perf-bench.spec.ts (synthetic
// grids/stacks) with the component shapes that real apps report as slow:
// a TanStack table with sorting/filtering/pagination/expansion, a
// @tanstack/react-virtual list, recharts SVG charts with per-mousemove
// tooltips, a crosshair heatmap, and a live dashboard re-rendering on an
// interval. Views live in the e2e-app-vite fixture at /?perf=heavy&view=*.
//
// Two scenario families:
// - "-passive" scenarios never activate react-grab: they measure the cost the
//   installed library adds to the app's own heavy interactions (the
//   "data route with the tanstack table is slow" case).
// - active scenarios exercise selection/hover/drag/copy on top of the same
//   heavy DOM, where detection, bounds tracking, and freezing do real work.
import { expect, getElementCenters, goToHeavyView, test } from "./perf-fixtures.js";
import { idleFrame, recordScenario } from "./perf-recorder.js";

const INP_SOFT_LIMIT_MS = 100;
// These scenarios measure app-dominated work (sorting/filtering 2000 rows),
// so absolute INP is hardware-bound: fine on a quiet dev machine, way over
// budget on CI runners regardless of react-grab's code (CI catches real
// regressions via the baseline-vs-current diff instead). Also skip under
// parallel local suites (worker contention) and COVERAGE (unminified,
// V8-instrumented build).
const SHOULD_ASSERT_INP =
  Boolean(process.env.PERF_LABEL) && !process.env.COVERAGE && !process.env.CI;
const TABLE_ROW_SELECTOR = "[data-heavy-table-row]";
const VIRTUAL_ROW_SELECTOR = "[data-heavy-virtual-row]";
const HEATMAP_CELL_SELECTOR = "[data-testid^='heatmap-cell-']";
const STAT_CARD_SELECTOR = "[data-heavy-stat-card]";
const FEED_ROW_SELECTOR = "[data-heavy-feed-row]";
const CHART_CONTAINER_SELECTORS = [
  "[data-testid='chart-line']",
  "[data-testid='chart-bar']",
  "[data-testid='chart-area']",
  "[data-testid='chart-scatter']",
];

test.describe.configure({ mode: "serial", retries: 0 });

test.describe("@perf heavy-ui benchmarks", () => {
  // ─── TanStack table ────────────────────────────────────────────────

  test("heavy-table-sort-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // Library installed but inactive: header-click sorting re-sorts 2000
    // rows and re-renders the page. Any react-grab passive listener /
    // observer cost shows up as INP on these clicks.
    void reactGrab;
    await goToHeavyView(page, "table");

    const sortableHeaders = [
      "[data-testid='table-header-task']",
      "[data-testid='table-header-score']",
      "[data-testid='table-header-cost']",
      "[data-testid='table-header-durationMin']",
    ];
    const aggregate = await recordScenario(page, testInfo, "heavy-table-sort-passive", async () => {
      for (let cycleIndex = 0; cycleIndex < 4; cycleIndex++) {
        for (const headerSelector of sortableHeaders) {
          // Three clicks walk the full asc → desc → unsorted cycle.
          for (let clickIndex = 0; clickIndex < 3; clickIndex++) {
            await page.locator(headerSelector).click();
            await page.waitForTimeout(40);
          }
        }
      }
      await idleFrame(page, 4);
    });
    if (SHOULD_ASSERT_INP) expect.soft(aggregate.inp).toBeLessThan(INP_SOFT_LIMIT_MS);
  });

  test("heavy-table-filter-typing-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // Each keystroke re-runs the global filter over 2000 rows and
    // re-renders the visible page — per-keystroke INP under load.
    void reactGrab;
    await goToHeavyView(page, "table");
    await page.locator("[data-testid='table-filter-input']").click();

    const aggregate = await recordScenario(
      page,
      testInfo,
      "heavy-table-filter-typing-passive",
      async () => {
        const filterQuery = "refactor table virtualization";
        for (const character of filterQuery) {
          await page.keyboard.type(character);
          await page.waitForTimeout(16);
        }
        for (let deleteIndex = 0; deleteIndex < filterQuery.length; deleteIndex++) {
          await page.keyboard.press("Backspace");
          await page.waitForTimeout(16);
        }
        await idleFrame(page, 4);
      },
      { samples: 2 },
    );
    if (SHOULD_ASSERT_INP) expect.soft(aggregate.inp).toBeLessThan(INP_SOFT_LIMIT_MS);
  });

  test("heavy-table-paginate-passive @perf", async ({ reactGrab, page }, testInfo) => {
    void reactGrab;
    await goToHeavyView(page, "table");

    await recordScenario(page, testInfo, "heavy-table-paginate-passive", async () => {
      for (let cycleIndex = 0; cycleIndex < 15; cycleIndex++) {
        await page.locator("[data-testid='table-next-page']").click();
        await page.waitForTimeout(40);
      }
      for (let cycleIndex = 0; cycleIndex < 15; cycleIndex++) {
        await page.locator("[data-testid='table-prev-page']").click();
        await page.waitForTimeout(40);
      }
      await idleFrame(page, 4);
    });
  });

  test("heavy-table-expand-rows-passive @perf", async ({ reactGrab, page }, testInfo) => {
    void reactGrab;
    await goToHeavyView(page, "table");

    await recordScenario(page, testInfo, "heavy-table-expand-rows-passive", async () => {
      for (let rowIndex = 0; rowIndex < 12; rowIndex++) {
        const expander = page.locator(`[data-testid='table-expand-${rowIndex}']`);
        await expander.click();
        await page.waitForTimeout(30);
        await expander.click();
        await page.waitForTimeout(30);
      }
      await idleFrame(page, 4);
    });
  });

  test("heavy-table-hover-in-selection-mode @perf", async ({ reactGrab, page }, testInfo) => {
    // The reported-slow case: selection mode over a dense table. Every row
    // hover re-runs detection, bounds computation, and label layout across
    // ~600 rendered cells.
    await goToHeavyView(page, "table");
    const rowCenters = await getElementCenters(page, TABLE_ROW_SELECTOR);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-table-hover-in-selection-mode", async () => {
      for (let passIndex = 0; passIndex < 4; passIndex++) {
        for (const center of rowCenters) {
          await page.mouse.move(center.x + (passIndex % 3) * 40, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("heavy-table-drag-select-rows @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "table");
    const rowCenters = await getElementCenters(page, TABLE_ROW_SELECTOR);
    if (rowCenters.length < 10) {
      test.skip(true, "not enough visible table rows");
      return;
    }

    await recordScenario(
      page,
      testInfo,
      "heavy-table-drag-select-rows",
      async () => {
        for (let dragIndex = 0; dragIndex < 8; dragIndex++) {
          const startCenter = rowCenters[dragIndex % 5];
          const endCenter = rowCenters[Math.min(rowCenters.length - 1, 5 + dragIndex)];
          await page.mouse.move(startCenter.x - 200, startCenter.y - 6, { steps: 1 });
          await page.mouse.down();
          await page.mouse.move(endCenter.x + 200, endCenter.y + 6, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(60);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
      {
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
  });

  test("heavy-table-multi-select-copy @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "table");
    const rowCenters = await getElementCenters(page, TABLE_ROW_SELECTOR, 12);

    await recordScenario(
      page,
      testInfo,
      "heavy-table-multi-select-copy",
      async () => {
        await page.keyboard.down("Shift");
        for (const center of rowCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
          await page.mouse.click(center.x, center.y);
          await page.waitForTimeout(15);
        }
        await page.keyboard.up("Shift");
        await page.waitForTimeout(80);
        const modifierKey = process.platform === "darwin" ? "Meta" : "Control";
        await page.keyboard.press(`${modifierKey}+Enter`);
        await page.waitForTimeout(300);
        await idleFrame(page, 4);
      },
      {
        samples: 2,
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
    await page.keyboard.press("Escape");
  });

  // ─── Virtualized list ──────────────────────────────────────────────

  test("heavy-virtual-scroll-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // Virtualizer mounts/unmounts rows every frame during a scroll storm.
    // Measures the library's passive cost on the busiest app path there is.
    void reactGrab;
    await goToHeavyView(page, "virtual");
    const containerBox = await page
      .locator("[data-testid='virtual-scroll-container']")
      .boundingBox();
    if (!containerBox) {
      test.skip(true, "virtual container missing");
      return;
    }
    await page.mouse.move(
      containerBox.x + containerBox.width / 2,
      containerBox.y + containerBox.height / 2,
    );

    await recordScenario(page, testInfo, "heavy-virtual-scroll-passive", async () => {
      for (let scrollIndex = 0; scrollIndex < 150; scrollIndex++) {
        await page.mouse.wheel(0, scrollIndex % 10 === 9 ? -600 : 300);
        await page.waitForTimeout(12);
      }
      await idleFrame(page, 4);
    });
  });

  test("heavy-virtual-scroll-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection active over the virtualizer: the hovered row is unmounted
    // and replaced mid-scroll, forcing constant re-detection + bounds
    // invalidation while rows recycle.
    await goToHeavyView(page, "virtual");
    const containerBox = await page
      .locator("[data-testid='virtual-scroll-container']")
      .boundingBox();
    if (!containerBox) {
      test.skip(true, "virtual container missing");
      return;
    }

    await reactGrab.activate();
    await page.mouse.move(
      containerBox.x + containerBox.width / 2,
      containerBox.y + containerBox.height / 2,
      { steps: 2 },
    );
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-virtual-scroll-during-selection", async () => {
      for (let scrollIndex = 0; scrollIndex < 150; scrollIndex++) {
        await page.mouse.wheel(0, scrollIndex % 10 === 9 ? -600 : 300);
        await page.waitForTimeout(12);
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("heavy-virtual-hover-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "virtual");

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-virtual-hover-sweep", async () => {
      for (let passIndex = 0; passIndex < 6; passIndex++) {
        const rowCenters = await getElementCenters(page, VIRTUAL_ROW_SELECTOR);
        for (const center of rowCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  // ─── Charts (recharts) ─────────────────────────────────────────────

  test("heavy-charts-tooltip-sweep-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // recharts re-renders its tooltip + active dots on every mousemove;
    // the app is already mousemove-bound, so any added pointer work from
    // the installed library is directly visible in frame times.
    void reactGrab;
    await goToHeavyView(page, "charts");
    const lineChartBox = await page.locator("[data-testid='chart-line']").boundingBox();
    if (!lineChartBox) {
      test.skip(true, "line chart missing");
      return;
    }

    await recordScenario(page, testInfo, "heavy-charts-tooltip-sweep-passive", async () => {
      for (let passIndex = 0; passIndex < 6; passIndex++) {
        for (let stepIndex = 0; stepIndex <= 40; stepIndex++) {
          await page.mouse.move(
            lineChartBox.x + (lineChartBox.width * stepIndex) / 40,
            lineChartBox.y + lineChartBox.height / 2,
            { steps: 1 },
          );
        }
      }
      await idleFrame(page, 4);
    });
  });

  test("heavy-charts-hover-in-selection-mode @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection over deep SVG trees: every detection walks SVG internals
    // (paths, ticks, legend spans) through validity filtering, while the
    // chart's own tooltip mousemove handler runs concurrently.
    await goToHeavyView(page, "charts");
    const chartBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (const chartSelector of CHART_CONTAINER_SELECTORS) {
      const box = await page.locator(chartSelector).boundingBox();
      if (box) chartBoxes.push(box);
    }
    if (chartBoxes.length === 0) {
      test.skip(true, "no charts rendered");
      return;
    }

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-charts-hover-in-selection-mode", async () => {
      for (let passIndex = 0; passIndex < 3; passIndex++) {
        for (const chartBox of chartBoxes) {
          for (let stepIndex = 0; stepIndex <= 20; stepIndex++) {
            await page.mouse.move(
              chartBox.x + (chartBox.width * stepIndex) / 20,
              chartBox.y + chartBox.height * (0.3 + 0.4 * (stepIndex % 2)),
              { steps: 1 },
            );
          }
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("heavy-charts-activate-cycle @perf", async ({ reactGrab, page }, testInfo) => {
    // Activate/deactivate over the charts view. The freeze path walks
    // animations and pseudo-states across four ResponsiveContainer SVG
    // trees on every cycle.
    void reactGrab;
    await goToHeavyView(page, "charts");

    await recordScenario(
      page,
      testInfo,
      "heavy-charts-activate-cycle",
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
  });

  test("heavy-charts-drag-select @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "charts");

    // Pre-warm the copy pipeline's symbolication caches. The first committed
    // drag storms the main thread, so the queued bundle/sourcemap fetch for
    // recharts times out, gets evicted, and retries on the next idle period —
    // parsing ~11MB of sourcemap into a retained cache on whichever sample
    // happens to be idle first. Running the full drag loop once and then
    // idling lets that one-time cost land before measurement instead of
    // flipping between warmup (discarded) and measured samples.
    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    for (let warmupIndex = 0; warmupIndex < 2; warmupIndex++) {
      await reactGrab.activate();
      for (let dragIndex = 0; dragIndex < 6; dragIndex++) {
        await page.mouse.move(40, 120, { steps: 1 });
        await page.mouse.down();
        await page.mouse.move(viewport.width - 60, viewport.height - 80, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(80);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(500);
      await idleFrame(page, 8);
    }

    await recordScenario(
      page,
      testInfo,
      "heavy-charts-drag-select",
      async () => {
        const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
        for (let dragIndex = 0; dragIndex < 6; dragIndex++) {
          await page.mouse.move(40, 120, { steps: 1 });
          await page.mouse.down();
          await page.mouse.move(viewport.width - 60, viewport.height - 80, { steps: 12 });
          await page.mouse.up();
          await page.waitForTimeout(80);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
      {
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
  });

  // ─── Heatmap ───────────────────────────────────────────────────────

  test("heavy-heatmap-crosshair-passive @perf", async ({ reactGrab, page }, testInfo) => {
    // The app's own hover work: imperative crosshair class toggles on
    // every mousemove plus a tooltip re-render, over ~1000 buttons.
    void reactGrab;
    await goToHeavyView(page, "heatmap");
    const cellCenters = await getElementCenters(page, HEATMAP_CELL_SELECTOR, 400);

    await recordScenario(page, testInfo, "heavy-heatmap-crosshair-passive", async () => {
      for (const center of cellCenters) {
        await page.mouse.move(center.x, center.y, { steps: 1 });
      }
      await idleFrame(page, 4);
    });
  });

  test("heavy-heatmap-hover-in-selection-mode @perf", async ({ reactGrab, page }, testInfo) => {
    // Same sweep with selection mode on: react-grab detection competes
    // with the app's crosshair mousemove handler on the exact same events.
    await goToHeavyView(page, "heatmap");
    const cellCenters = await getElementCenters(page, HEATMAP_CELL_SELECTOR, 400);

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-heatmap-hover-in-selection-mode", async () => {
      for (const center of cellCenters) {
        await page.mouse.move(center.x, center.y, { steps: 1 });
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  // ─── Live dashboard ────────────────────────────────────────────────

  test("heavy-dashboard-selection-under-rerender @perf", async ({ reactGrab, page }, testInfo) => {
    // Selection held on a stat card while the dashboard re-renders every
    // 250ms: selection bounds must track an element React keeps
    // recommitting, without polling or leaking work into idle frames.
    await goToHeavyView(page, "dashboard");
    const cardCenters = await getElementCenters(page, STAT_CARD_SELECTOR, 1);
    if (cardCenters.length === 0) {
      test.skip(true, "no stat cards");
      return;
    }

    await reactGrab.activate();
    await page.mouse.move(cardCenters[0].x, cardCenters[0].y, { steps: 2 });
    await idleFrame(page, 2);

    await recordScenario(
      page,
      testInfo,
      "heavy-dashboard-selection-under-rerender",
      async () => {
        await page.waitForTimeout(3000);
      },
      { samples: 2 },
    );
    await reactGrab.deactivate();
  });

  test("heavy-dashboard-hover-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "dashboard");
    const hoverCenters = [
      ...(await getElementCenters(page, STAT_CARD_SELECTOR)),
      ...(await getElementCenters(page, FEED_ROW_SELECTOR, 15)),
    ];

    await reactGrab.activate();
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-dashboard-hover-sweep", async () => {
      for (let passIndex = 0; passIndex < 5; passIndex++) {
        for (const center of hoverCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
        }
      }
      await idleFrame(page, 4);
    });
    await reactGrab.deactivate();
  });

  test("heavy-dashboard-drag-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    // Drag selection while the underlying elements re-render mid-drag.
    await goToHeavyView(page, "dashboard");

    await recordScenario(
      page,
      testInfo,
      "heavy-dashboard-drag-sweep",
      async () => {
        const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
        for (let dragIndex = 0; dragIndex < 6; dragIndex++) {
          await page.mouse.move(30, 100, { steps: 1 });
          await page.mouse.down();
          await page.mouse.move(viewport.width - 50, viewport.height - 50, { steps: 12 });
          await page.mouse.up();
          await page.waitForTimeout(80);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
      {
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
  });

  // ─── Combined page ─────────────────────────────────────────────────

  test("heavy-all-activate-toggle @perf", async ({ reactGrab, page }, testInfo) => {
    // Everything mounted at once (table + virtual list + 4 charts +
    // heatmap + ticking dashboard): the freeze/unfreeze install cost on a
    // DOM shaped like a real product page.
    void reactGrab;
    await goToHeavyView(page, "all");

    await recordScenario(
      page,
      testInfo,
      "heavy-all-activate-toggle",
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
  });

  test("heavy-all-drag-sweep @perf", async ({ reactGrab, page }, testInfo) => {
    await goToHeavyView(page, "all");

    await recordScenario(
      page,
      testInfo,
      "heavy-all-drag-sweep",
      async () => {
        const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
        for (let dragIndex = 0; dragIndex < 4; dragIndex++) {
          await page.mouse.move(20, 90, { steps: 1 });
          await page.mouse.down();
          await page.mouse.move(viewport.width - 40, viewport.height - 40, { steps: 16 });
          await page.mouse.up();
          await page.waitForTimeout(100);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(40);
        }
        await idleFrame(page, 4);
      },
      {
        samples: 2,
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
  });

  test("heavy-all-scroll-during-selection @perf", async ({ reactGrab, page }, testInfo) => {
    // Page-level scroll across all mounted heavy sections with a selection
    // active — bounds invalidation against charts, tables, and the ticking
    // dashboard at different scroll offsets.
    await goToHeavyView(page, "all");
    await reactGrab.activate();
    await page.mouse.move(500, 300, { steps: 2 });
    await idleFrame(page, 2);

    await recordScenario(page, testInfo, "heavy-all-scroll-during-selection", async () => {
      for (let scrollIndex = 0; scrollIndex < 120; scrollIndex++) {
        await page.mouse.wheel(0, scrollIndex % 8 < 6 ? 250 : -700);
        await page.waitForTimeout(12);
      }
      await idleFrame(page, 4);
    });
    await page.keyboard.press("Escape");
  });

  test("heavy-all-copy-cross-section @perf", async ({ reactGrab, page }, testInfo) => {
    // Shift-click one element from each heavy section, then copy: payload
    // aggregation spans a table row, virtual row, SVG chart, heatmap cell,
    // and a live-updating card in a single grab.
    await goToHeavyView(page, "all");
    const sectionSelectors = [
      TABLE_ROW_SELECTOR,
      "[data-testid='table-filter-input']",
      "[data-testid='heavy-table'] th",
    ];
    const targetCenters: Array<{ x: number; y: number }> = [];
    for (const sectionSelector of sectionSelectors) {
      const centers = await getElementCenters(page, sectionSelector, 2);
      targetCenters.push(...centers);
    }
    if (targetCenters.length < 3) {
      test.skip(true, "not enough visible cross-section targets");
      return;
    }

    await recordScenario(
      page,
      testInfo,
      "heavy-all-copy-cross-section",
      async () => {
        await page.keyboard.down("Shift");
        for (const center of targetCenters) {
          await page.mouse.move(center.x, center.y, { steps: 1 });
          await page.mouse.click(center.x, center.y);
          await page.waitForTimeout(20);
        }
        await page.keyboard.up("Shift");
        await page.waitForTimeout(80);
        const modifierKey = process.platform === "darwin" ? "Meta" : "Control";
        await page.keyboard.press(`${modifierKey}+Enter`);
        await page.waitForTimeout(300);
        await idleFrame(page, 4);
      },
      {
        samples: 2,
        beforeEachSample: async () => {
          await reactGrab.activate();
          await idleFrame(page, 2);
        },
      },
    );
    await page.keyboard.press("Escape");
  });
});
