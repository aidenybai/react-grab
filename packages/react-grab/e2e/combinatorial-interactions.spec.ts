import { test, expect } from "./fixtures.js";
import { goToSizedPerfGrid } from "./perf-fixtures.js";

const STATE_SETTLE_WAIT_MS = 300;
// Copy commits run source resolution before writing the clipboard, which can
// take well past the default 5s poll on loaded CI runners.
const CLIPBOARD_COMMIT_TIMEOUT_MS = 15_000;
const MASSIVE_GRID_ROWS = 200;
const MASSIVE_GRID_COLUMNS = 50;

test.describe("Combinatorial Interactions", () => {
  test.describe("Prompt mode under interrupts", () => {
    test("should keep prompt mode open through a viewport resize", async ({ reactGrab }) => {
      await reactGrab.enterPromptMode("li:first-child");
      expect(await reactGrab.isPromptModeActive()).toBe(true);

      await reactGrab.setViewportSize(900, 600);
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      expect(await reactGrab.isPromptModeActive()).toBe(true);
      await reactGrab.typeInInput("still typing");
      expect(await reactGrab.getInputValue()).toBe("still typing");
    });

    test("should keep prompt mode open while scrolling", async ({ reactGrab }) => {
      await reactGrab.enterPromptMode("li:first-child");
      await reactGrab.typeInInput("before scroll");

      await reactGrab.scrollPage(400);
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      expect(await reactGrab.isPromptModeActive()).toBe(true);
      expect(await reactGrab.getInputValue()).toBe("before scroll");
    });

    test("should survive the prompt target being removed from the DOM", async ({ reactGrab }) => {
      await reactGrab.enterPromptMode("li:first-child");
      expect(await reactGrab.isPromptModeActive()).toBe(true);

      await reactGrab.removeElement("li:first-child");
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      await reactGrab.typeInInput("target gone");
      expect(await reactGrab.getInputValue()).toBe("target gone");

      await reactGrab.pressEscape();
      await reactGrab.pressEscape();
      const state = await reactGrab.getState();
      expect(state.isActive).toBe(false);
    });

    test("should tear down cleanly when disposed while prompt mode is open", async ({
      reactGrab,
    }) => {
      await reactGrab.enterPromptMode("li:first-child");
      await reactGrab.typeInInput("about to dispose");

      await reactGrab.dispose();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      await reactGrab.reinitialize();
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });
  });

  test.describe("Context menu under interrupts", () => {
    test("should keep the context menu open through a viewport resize", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");
      await reactGrab.rightClickElement("[data-testid='main-title']");
      await expect.poll(() => reactGrab.isContextMenuVisible()).toBe(true);

      await reactGrab.setViewportSize(1000, 650);
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      const state = await reactGrab.getState();
      expect(state.isActive).toBe(true);
    });

    test("should tear down cleanly when disposed while the context menu is open", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");
      await reactGrab.rightClickElement("[data-testid='main-title']");
      await expect.poll(() => reactGrab.isContextMenuVisible()).toBe(true);

      await reactGrab.dispose();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      await reactGrab.reinitialize();
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);
    });

    test("Escape over an open context menu should dismiss both menu and overlay", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");
      await reactGrab.rightClickElement("[data-testid='main-title']");
      await expect.poll(() => reactGrab.isContextMenuVisible()).toBe(true);

      await reactGrab.pressEscape();

      await expect.poll(() => reactGrab.isContextMenuVisible()).toBe(false);
      await expect.poll(async () => (await reactGrab.getState()).isActive).toBe(false);
    });
  });

  test.describe("Drag under interrupts", () => {
    test("Escape mid-drag should cancel the drag and deactivate the overlay", async ({
      reactGrab,
    }) => {
      await reactGrab.page.evaluate(() => navigator.clipboard.writeText(""));
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const box = await firstItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 100, { steps: 5 });
      expect((await reactGrab.getState()).isDragging).toBe(true);

      await reactGrab.pressEscape();
      await expect.poll(async () => (await reactGrab.getState()).isActive).toBe(false);
      await expect.poll(async () => (await reactGrab.getState()).isDragging).toBe(false);
      await reactGrab.page.mouse.up();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(false);
      expect(state.isActive).toBe(false);
      expect(await reactGrab.getClipboardContent()).toBe("");
    });

    test("API deactivation mid-drag should end both drag and overlay", async ({ reactGrab }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const box = await firstItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 100, { steps: 5 });
      expect((await reactGrab.getState()).isDragging).toBe(true);

      await reactGrab.deactivate();
      await reactGrab.page.mouse.up();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(false);
      expect(state.isActive).toBe(false);
    });

    test("viewport resize mid-drag should keep drag state consistent", async ({ reactGrab }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const box = await firstItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 150, box.y + 100, { steps: 5 });
      expect((await reactGrab.getState()).isDragging).toBe(true);

      await reactGrab.setViewportSize(1100, 700);
      await reactGrab.page.mouse.move(box.x + 180, box.y + 120, { steps: 3 });
      await reactGrab.page.mouse.up();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      expect((await reactGrab.getState()).isDragging).toBe(false);
      await expect.poll(() => reactGrab.getClipboardContent()).not.toBe("");
    });
  });

  test.describe("Multi-select crossed with menus", () => {
    test("right-click during shift multi-select should not commit the accumulated copy", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
      const firstBox = await firstItem.boundingBox();
      if (!firstBox) throw new Error("Could not get bounding box");

      await reactGrab.page.keyboard.down("Shift");
      await reactGrab.page.mouse.click(
        firstBox.x + firstBox.width / 2,
        firstBox.y + firstBox.height / 2,
      );
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.rightClickElement("[data-testid='main-title']");
      await expect.poll(() => reactGrab.isContextMenuVisible()).toBe(true);

      await reactGrab.page.keyboard.up("Shift");
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      expect(await reactGrab.isContextMenuVisible()).toBe(true);
      expect((await reactGrab.getState()).isActive).toBe(true);

      await reactGrab.pressEscape();
    });
  });

  test.describe("Option updates mid-interaction", () => {
    test("switching activationMode while active should not disturb the active overlay", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      expect(await reactGrab.isOverlayVisible()).toBe(true);

      await reactGrab.updateOptions({ activationMode: "hold" });
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      expect((await reactGrab.getState()).isActive).toBe(true);

      await reactGrab.pressEscape();
      await expect.poll(async () => (await reactGrab.getState()).isActive).toBe(false);
    });

    test("changing activationKey while active should keep the overlay and honor the new key", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.updateOptions({ activationKey: "g", activationMode: "toggle" });

      expect((await reactGrab.getState()).isActive).toBe(true);

      await reactGrab.deactivate();
      await reactGrab.page.click("body");
      await reactGrab.page.keyboard.down("g");
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);
      await reactGrab.page.keyboard.up("g");
      await expect.poll(async () => (await reactGrab.getState()).isActive).toBe(true);

      await reactGrab.pressEscape();
    });
  });

  test.describe("Copy crossed with lifecycle", () => {
    test("element click copy followed by immediate deactivate and reactivate stays consistent", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");
      await reactGrab.clickElement("[data-testid='main-title']");
      await reactGrab.deactivate();
      await reactGrab.activate();

      const state = await reactGrab.getState();
      expect(state.isActive).toBe(true);
      expect(state.isCopying).toBe(false);

      await reactGrab.hoverUntilSelected("[data-testid='test-input']");
      expect(await reactGrab.isSelectionBoxVisible()).toBe(true);
    });

    test("copy via API while a drag is in progress should not corrupt drag state", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const firstItem = reactGrab.page.locator("li").first();
      const box = await firstItem.boundingBox();
      if (!box) throw new Error("Could not get bounding box");

      await reactGrab.page.mouse.move(box.x - 10, box.y - 10);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(box.x + 120, box.y + 80, { steps: 5 });

      const didCopy = await reactGrab.copyElementViaApi("[data-testid='main-title']");
      expect(didCopy).toBe(true);

      await reactGrab.page.mouse.up();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(false);
    });
  });

  test.describe("Drag across a massive DOM", () => {
    test("cancelled drag sweep across ~10k React cells cleans up without committing", async ({
      reactGrab,
    }) => {
      await goToSizedPerfGrid(reactGrab.page, MASSIVE_GRID_ROWS, MASSIVE_GRID_COLUMNS);
      await reactGrab.activate();
      const clipboardBefore = await reactGrab.getClipboardContent();

      const viewport = reactGrab.page.viewportSize() ?? { width: 1280, height: 720 };
      await reactGrab.page.mouse.move(20, 80);
      await reactGrab.page.mouse.down();
      await reactGrab.page.mouse.move(viewport.width - 40, viewport.height - 40, { steps: 12 });
      expect((await reactGrab.getState()).isDragging).toBe(true);

      await reactGrab.pressEscape();
      await expect.poll(async () => (await reactGrab.getState()).isActive).toBe(false);
      await reactGrab.page.mouse.up();

      const state = await reactGrab.getState();
      expect(state.isDragging).toBe(false);
      expect(await reactGrab.getClipboardContent()).toBe(clipboardBefore);
    });

    test("committed drag over a dense region copies without hanging", async ({ reactGrab }) => {
      await goToSizedPerfGrid(reactGrab.page, MASSIVE_GRID_ROWS, MASSIVE_GRID_COLUMNS);
      await reactGrab.activate();

      await reactGrab.dragSelect("[data-testid='perf-cell-0-0']", "[data-testid='perf-cell-4-9']");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: CLIPBOARD_COMMIT_TIMEOUT_MS })
        .toContain("perf-cell-0-0");
      await expect.poll(async () => (await reactGrab.getState()).isDragging).toBe(false);
    });
  });

  test.describe("Arrow navigation crossed with other features", () => {
    test("drag selection after discarding an arrow-frozen selection commits normally", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='todo-list'] li:first-child");
      await reactGrab.pressArrowUp();
      await reactGrab.waitForSelectionBox();

      // Mouse movement over an arrow-frozen selection arms the discard
      // prompt, which swallows the next pointerdown. Walk through the
      // prompt deterministically before dragging — otherwise whether the
      // drag starts depends on pointermove/pointerdown delivery order.
      await reactGrab.page.mouse.move(0, 0);
      await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(true);
      await reactGrab.pressEnter();
      await expect.poll(() => reactGrab.isPendingDismissVisible()).toBe(false);

      await reactGrab.dragSelect(
        "[data-testid='todo-list'] li:first-child",
        "[data-testid='todo-list'] li:last-child",
      );

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: CLIPBOARD_COMMIT_TIMEOUT_MS })
        .not.toBe("");
      expect((await reactGrab.getState()).isDragging).toBe(false);
    });

    test("arrow keys while the context menu is open do not move the frozen selection", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='main-title']");
      await reactGrab.rightClickElement("[data-testid='main-title']");
      await expect.poll(() => reactGrab.isContextMenuVisible()).toBe(true);

      const boundsBefore = await reactGrab.getSelectionBoxBounds();
      await reactGrab.pressArrowUp();
      await reactGrab.pressArrowDown();
      await reactGrab.page.waitForTimeout(STATE_SETTLE_WAIT_MS);

      expect(await reactGrab.isContextMenuVisible()).toBe(true);
      const boundsAfter = await reactGrab.getSelectionBoxBounds();
      expect(boundsAfter).toEqual(boundsBefore);
    });

    test("arrow keys typed inside the prompt textarea do not move the selection", async ({
      reactGrab,
    }) => {
      await reactGrab.enterPromptMode("[data-testid='main-title']");
      await reactGrab.typeInInput("hello");

      await reactGrab.pressArrowLeft();
      await reactGrab.pressArrowLeft();
      await reactGrab.typeInInput("XX");

      expect(await reactGrab.isPromptModeActive()).toBe(true);
      expect(await reactGrab.getInputValue()).toBe("helXXlo");
    });
  });
});
