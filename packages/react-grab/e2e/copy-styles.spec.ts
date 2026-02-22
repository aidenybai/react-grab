import { test, expect } from "./fixtures.js";

test.describe("Copy styles", () => {
  test.describe("Context Menu", () => {
    test("should show Copy styles in context menu", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");

      const menuInfo = await reactGrab.getContextMenuInfo();
      expect(menuInfo.isVisible).toBe(true);
      expect(
        menuInfo.menuItems.map((item: string) => item.toLowerCase()),
      ).toContain("copy styles");
    });

    test("should copy CSS declarations to clipboard via context menu", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toMatch(/[\w-]+:\s*.+;/);
    });

    test("should include className header when element has a class", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toContain("className:");
    });

    test("should contain CSS property-value pairs", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='submit-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='submit-button']");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toMatch(/[\w-]+:\s*.+;/);

      const content = await reactGrab.getClipboardContent();
      const hasRelevantProperty =
        content.includes("background-color:") ||
        content.includes("color:") ||
        content.includes("padding-");
      expect(hasRelevantProperty).toBe(true);
    });
  });

  test.describe("Feedback", () => {
    test("should show Copied feedback after Copy styles", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='submit-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='submit-button']");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getLabelStatusText(), { timeout: 5000 })
        .toBe("Copied");
    });

    test("should dismiss context menu after Copy styles action", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("li:first-child");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.isContextMenuVisible(), { timeout: 2000 })
        .toBe(false);
    });
  });

  test.describe("Different Elements", () => {
    test("should copy CSS for element with background and color styles", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='gradient-div']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='gradient-div']");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toMatch(/[\w-]+:\s*.+;/);

      const clipboardContent = await reactGrab.getClipboardContent();
      expect(clipboardContent).toMatch(/width:|height:|background/);
    });

    test("should produce output for a plain element with no custom styles", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='deeply-nested-text']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='deeply-nested-text']");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toBeTruthy();
    });

    test("should copy different CSS for different elements", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='submit-button']");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='submit-button']");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(() => reactGrab.getClipboardContent(), { timeout: 5000 })
        .toMatch(/[\w-]+:\s*.+;/);

      const firstCss = await reactGrab.getClipboardContent();

      await reactGrab.activate();
      await reactGrab.hoverElement("[data-testid='todo-list'] h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("[data-testid='todo-list'] h1");
      await reactGrab.clickContextMenuItem("Copy styles");

      await expect
        .poll(
          async () => {
            const content = await reactGrab.getClipboardContent();
            return content !== firstCss;
          },
          { timeout: 5000 },
        )
        .toBe(true);
    });
  });
});
