import { test, expect } from "./fixtures.js";

test.describe("Viewport and Scroll Handling", () => {
  test("should maintain selection after scrolling page", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.scrollPage(50);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should update selection position after viewport resize", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.setViewportSize({ width: 800, height: 600 });
    await reactGrab.page.waitForTimeout(200);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    await reactGrab.page.setViewportSize({ width: 1280, height: 720 });
  });

  test("should handle mouse movement after scroll", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.scrollPage(100);

    await reactGrab.hoverElement("li:nth-child(5)");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should allow drag selection after scrolling", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.scrollPage(50);

    await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should preserve frozen selection during scroll via arrow navigation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.scrollPage(100);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should handle keyboard navigation after scroll", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.scrollPage(50);

    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressArrowDown();
    await reactGrab.pressArrowDown();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should copy element after resize using click", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.setViewportSize({ width: 600, height: 400 });
    await reactGrab.page.waitForTimeout(200);

    await reactGrab.clickElement("h1");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Todo List");

    await reactGrab.page.setViewportSize({ width: 1280, height: 720 });
  });
});
