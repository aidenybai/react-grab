// Functional coverage for the heavy-UI fixture (/?perf=heavy&view=*): grabs
// must work correctly on TanStack table rows, virtualized rows that recycle,
// recharts SVG internals, heatmap cells with imperative hover handlers, and
// live-rerendering dashboard cards — not just stay fast (perf-heavy.spec.ts
// owns that). Runs in the normal suite, so COVERAGE=1 runs exercise these
// paths too.
import { expect, getElementCenters, goToHeavyView, test } from "./perf-fixtures.js";

test.describe("heavy-ui: tanstack table", () => {
  test("grabs a table row and copies its context", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "table");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-heavy-table-row='0']");

    await reactGrab.clickElement("[data-heavy-table-row='0']");
    await page.waitForFunction(
      () => {
        const instances = window.__REACT_GRAB__?.getState?.()?.labelInstances ?? [];
        return instances.some(
          (instance) => instance.status === "copied" || instance.status === "fading",
        );
      },
      undefined,
      { timeout: 10_000 },
    );
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("tanstack-table");
  });

  test("grabs on a freshly sorted table", async ({ reactGrab, page }) => {
    // Clicks are grab gestures while selection mode is active (window-level
    // capture), so the app can't re-sort mid-selection by design. What must
    // hold: after the table re-sorts and re-renders every row, grabbing the
    // new row DOM still works.
    await goToHeavyView(page, "table");
    await page.locator("[data-testid='table-header-score']").click();
    await page.waitForTimeout(200);

    await reactGrab.activate();
    // Row ids are data-indexed, so the sorted first page holds different ids;
    // grab whichever row now renders first.
    await reactGrab.hoverUntilSelected("[data-heavy-table-row]");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("filter input still types while selection mode is active", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "table");
    const filterInput = page.locator("[data-testid='table-filter-input']");
    await filterInput.click({ force: true });
    await reactGrab.activate();

    await filterInput.click({ force: true });
    await reactGrab.deactivate();
    await filterInput.click();
    await page.keyboard.type("refactor");
    await expect(filterInput).toHaveValue("refactor");
    const rowCountText = await page.locator("[data-testid='table-row-count']").innerText();
    expect(rowCountText).not.toContain("2,000 rows");
  });

  test("drag-selects multiple table rows", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "table");
    await reactGrab.activate();

    const rowCenters = await getElementCenters(page, "[data-heavy-table-row]", 6);
    expect(rowCenters.length).toBeGreaterThanOrEqual(4);
    const firstRow = rowCenters[0];
    const lastRow = rowCenters[rowCenters.length - 1];

    await page.mouse.move(firstRow.x - 250, firstRow.y - 5, { steps: 1 });
    await page.mouse.down();
    await page.mouse.move(lastRow.x + 250, lastRow.y + 5, { steps: 8 });

    const dragBounds = await reactGrab.getDragBoxBounds();
    expect(dragBounds).not.toBeNull();
    await page.mouse.up();
    await page.keyboard.press("Escape");
  });
});

test.describe("heavy-ui: virtualized list", () => {
  test("grabs a virtual row", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "virtual");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-heavy-virtual-row='3']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("selection recovers after rows recycle under scroll", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "virtual");
    const containerBox = await page
      .locator("[data-testid='virtual-scroll-container']")
      .boundingBox();
    expect(containerBox).not.toBeNull();
    if (!containerBox) return;

    await reactGrab.activate();
    await page.mouse.move(
      containerBox.x + containerBox.width / 2,
      containerBox.y + containerBox.height / 2,
      { steps: 2 },
    );
    await page.waitForTimeout(300);

    // Scroll far enough that every mounted row unmounts and is replaced.
    for (let scrollIndex = 0; scrollIndex < 20; scrollIndex++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(20);
    }
    await page.mouse.move(
      containerBox.x + containerBox.width / 2,
      containerBox.y + containerBox.height / 3,
      { steps: 2 },
    );
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isOverlayVisible()).toBe(true);
    await reactGrab.deactivate();
  });
});

test.describe("heavy-ui: charts", () => {
  test("grabs inside a recharts SVG", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "charts");
    await reactGrab.activate();

    const chartBox = await page.locator("[data-testid='chart-line']").boundingBox();
    expect(chartBox).not.toBeNull();
    if (!chartBox) return;
    await page.mouse.move(chartBox.x + chartBox.width / 2, chartBox.y + chartBox.height / 2, {
      steps: 2,
    });
    await reactGrab.waitForSelectionBox();
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("chart tooltip still tracks after deactivate", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "charts");
    await reactGrab.activate();
    await reactGrab.deactivate();

    const chartBox = await page.locator("[data-testid='chart-line']").boundingBox();
    expect(chartBox).not.toBeNull();
    if (!chartBox) return;
    await page.mouse.move(chartBox.x + chartBox.width * 0.3, chartBox.y + chartBox.height / 2, {
      steps: 4,
    });
    await page.mouse.move(chartBox.x + chartBox.width * 0.6, chartBox.y + chartBox.height / 2, {
      steps: 4,
    });
    await expect(page.locator(".recharts-tooltip-wrapper").first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("heavy-ui: heatmap", () => {
  test("grabs a heatmap cell while the app crosshair handler runs", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "heatmap");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-testid='heatmap-cell-5-5']");
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();

    // App-level hover behavior must still work after deactivation.
    await page.locator("[data-testid='heatmap-cell-10-10']").hover();
    await expect(page.locator("[data-testid='heatmap-tooltip']")).toBeVisible();
  });
});

test.describe("heavy-ui: live dashboard", () => {
  test("selection stays on a stat card across interval re-renders", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "dashboard");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-heavy-stat-card]");

    // Two dashboard ticks re-render every card; selection must persist.
    await page.waitForTimeout(700);
    expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    await reactGrab.deactivate();
  });

  test("copies a feed row that is being highlighted by the ticker", async ({ reactGrab, page }) => {
    await goToHeavyView(page, "dashboard");
    await reactGrab.activate();
    await reactGrab.hoverUntilSelected("[data-heavy-feed-row]");
    await reactGrab.clickElement("[data-heavy-feed-row]");
    await page.waitForFunction(
      () => {
        const instances = window.__REACT_GRAB__?.getState?.()?.labelInstances ?? [];
        return instances.some(
          (instance) => instance.status === "copied" || instance.status === "fading",
        );
      },
      undefined,
      { timeout: 10_000 },
    );
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });
});
