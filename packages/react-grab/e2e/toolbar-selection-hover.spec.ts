import { test, expect } from "./fixtures.js";

const ATTRIBUTE_NAME = "data-react-grab";

const hoverToolbar = async (page: import("@playwright/test").Page) => {
  const toolbarRect = await page.evaluate((attrName) => {
    const host = document.querySelector(`[${attrName}]`);
    const shadowRoot = host?.shadowRoot;
    if (!shadowRoot) return null;
    const root = shadowRoot.querySelector(`[${attrName}]`);
    if (!root) return null;
    const toolbar = root.querySelector<HTMLElement>(
      "[data-react-grab-toolbar]",
    );
    if (!toolbar) return null;
    const rect = toolbar.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, ATTRIBUTE_NAME);

  if (!toolbarRect) throw new Error("Toolbar not found");

  await page.mouse.move(
    toolbarRect.x + toolbarRect.width / 2,
    toolbarRect.y + toolbarRect.height / 2,
  );
  await page.waitForTimeout(150);
};

const hoverAwayFromToolbar = async (page: import("@playwright/test").Page) => {
  await page.mouse.move(10, 10);
  await page.waitForTimeout(150);
};

test.describe("Toolbar Selection Hover", () => {
  test.describe("Selection Mode", () => {
    test("should hide selection box when hovering toolbar", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(true);

      await hoverToolbar(reactGrab.page);

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should hide selection label when hovering toolbar", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await expect
        .poll(() => reactGrab.isSelectionLabelVisible(), { timeout: 2000 })
        .toBe(true);

      await hoverToolbar(reactGrab.page);

      await expect
        .poll(() => reactGrab.isSelectionLabelVisible(), { timeout: 2000 })
        .toBe(false);
    });

    test("should restore selection after moving mouse back from toolbar", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await hoverToolbar(reactGrab.page);

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(false);

      await reactGrab.hoverElement("li");

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should hide crosshair when hovering toolbar", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await expect
        .poll(() => reactGrab.isCrosshairVisible(), { timeout: 2000 })
        .toBe(true);

      await hoverToolbar(reactGrab.page);

      await expect
        .poll(() => reactGrab.isCrosshairVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });

  test.describe("Frozen Mode", () => {
    test("should keep selection box visible when hovering toolbar after right-click freeze", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li");

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(true);

      await hoverToolbar(reactGrab.page);

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("should keep selection box visible after context menu dismiss and toolbar hover", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li");

      await expect
        .poll(() => reactGrab.isContextMenuVisible(), { timeout: 2000 })
        .toBe(true);

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(true);

      await hoverToolbar(reactGrab.page);

      await expect
        .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
        .toBe(true);
    });

    test("selection box should not flicker when moving between frozen element and toolbar", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li");
      await reactGrab.waitForSelectionBox();

      await reactGrab.rightClickElement("li");

      for (let hoverIndex = 0; hoverIndex < 3; hoverIndex++) {
        await hoverToolbar(reactGrab.page);
        await expect
          .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
          .toBe(true);

        await hoverAwayFromToolbar(reactGrab.page);
        await expect
          .poll(() => reactGrab.isSelectionBoxVisible(), { timeout: 2000 })
          .toBe(true);
      }
    });
  });
});
