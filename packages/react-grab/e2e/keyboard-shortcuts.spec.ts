import { test, expect } from "./fixtures.js";

test.describe("Keyboard Shortcuts", () => {
  test("should copy selected element when clicking", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("h1");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Todo List");
  });

  test("should deactivate when pressing Escape while hovering", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.pressEscape();
    await reactGrab.page.waitForTimeout(100);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should not activate when pressing C without Cmd/Ctrl modifier", async ({
    reactGrab,
  }) => {
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(50);
    await reactGrab.page.keyboard.up("c");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should copy list item when clicked", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:nth-child(2)");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("li:nth-child(2)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Write a blog post");
  });

  test("should keep overlay active while navigating with arrow keys", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    for (let i = 0; i < 5; i++) {
      await reactGrab.page.keyboard.press("ArrowDown");
      await reactGrab.page.waitForTimeout(50);
    }

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should deactivate after successful click copy in toggle mode", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("li:first-child");
    await reactGrab.page.waitForTimeout(2000);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });
});
