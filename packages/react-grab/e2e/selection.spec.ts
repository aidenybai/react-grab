import { test, expect } from "./fixtures.js";

test.describe("Element Selection", () => {
  test("should show selection box when hovering over element while active", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.waitForSelectionBox();

    const hasSelectionContent = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector("[data-react-grab]");
      return root !== null && root.innerHTML.length > 0;
    });

    expect(hasSelectionContent).toBe(true);
  });

  test("should copy element content to clipboard on click", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("li");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });

  test("should copy heading element to clipboard", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("h1");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Todo List");
  });

  test("should highlight different elements when hovering", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.hoverElement("h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    await reactGrab.hoverElement("ul");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });

  test("should deactivate after successful copy in toggle mode", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li");
    await reactGrab.clickElement("li");

    await reactGrab.page.waitForTimeout(2000);

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should not show selection when inactive", async ({ reactGrab }) => {
    const isVisibleBefore = await reactGrab.isOverlayVisible();
    expect(isVisibleBefore).toBe(false);

    await reactGrab.hoverElement("li");
    await reactGrab.page.waitForTimeout(100);

    const isVisibleAfter = await reactGrab.isOverlayVisible();
    expect(isVisibleAfter).toBe(false);
  });

  test("should select nested elements correctly", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.hoverElement("li:nth-child(3)");
    await reactGrab.waitForSelectionBox();
    await reactGrab.clickElement("li:nth-child(3)");
    await reactGrab.page.waitForTimeout(500);

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toBeTruthy();
  });

  test("should maintain selection target while hovering", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const listItem = reactGrab.page.locator("li").first();
    const box = await listItem.boundingBox();
    if (!box) throw new Error("Could not get bounding box");

    await reactGrab.page.mouse.move(
      box.x + box.width / 2,
      box.y + box.height / 2,
    );
    await reactGrab.waitForSelectionBox();

    await reactGrab.page.mouse.move(
      box.x + box.width / 2 + 5,
      box.y + box.height / 2 + 5,
    );
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(true);
  });
});
