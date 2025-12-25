import { test, expect } from "./fixtures.js";

test.describe("Hold Activation Mode", () => {
  test("should not activate when pressing C without Cmd/Ctrl modifier", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("body");
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(50);
    await reactGrab.page.keyboard.up("c");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should allow multiple API activations in sequence", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    let isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    await reactGrab.pressEscape();
    await reactGrab.page.waitForTimeout(100);

    isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);

    await reactGrab.activate();

    isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should allow selection after API activation", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should allow dragging after API activation", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.mouse.move(firstBox.x - 10, firstBox.y - 10);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(firstBox.x + 100, firstBox.y + 100, {
      steps: 5,
    });

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);

    await reactGrab.page.mouse.up();
  });

  test("should copy heading element after API activation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("h1");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Todo List");
  });
});
