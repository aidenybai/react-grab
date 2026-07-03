import { test, expect } from "./fixtures.js";

const STATE_SETTLE_WAIT_MS = 300;

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
});
