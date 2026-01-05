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
    await expect.poll(() => reactGrab.getClipboardContent()).toBeTruthy();

    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent.length).toBeGreaterThan(0);
  });

  test("should copy heading element to clipboard", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='todo-list'] h1");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("[data-testid='todo-list'] h1");
    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Todo List");
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

    await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 3000 }).toBe(false);
  });

  test("should not show selection when inactive", async ({ reactGrab }) => {
    const isVisibleBefore = await reactGrab.isOverlayVisible();
    expect(isVisibleBefore).toBe(false);

    await reactGrab.hoverElement("li");

    const isVisibleAfter = await reactGrab.isOverlayVisible();
    expect(isVisibleAfter).toBe(false);
  });

  test("should select nested elements correctly", async ({ reactGrab }) => {
    await reactGrab.activate();

    await reactGrab.hoverElement("li:nth-child(3)");
    await reactGrab.waitForSelectionBox();
    await reactGrab.clickElement("li:nth-child(3)");

    await expect.poll(() => reactGrab.getClipboardContent()).toBeTruthy();
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

test.describe("Selection Bounds and Mutations", () => {
  test("selection box should update when element size changes", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    const initialBounds = await reactGrab.getSelectionBoxBounds();
    expect(initialBounds).not.toBeNull();

    await reactGrab.page.evaluate(() => {
      const element = document.querySelector("li:first-child") as HTMLElement;
      if (element) {
        element.style.height = "200px";
      }
    });

    await expect.poll(async () => {
      const bounds = await reactGrab.getSelectionBoxBounds();
      return bounds?.height ?? 0;
    }).toBeGreaterThan(initialBounds?.height ?? 0);
  });

  test("selection should handle element being hidden", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='toggleable-element']");
    await reactGrab.waitForSelectionBox();

    await reactGrab.hideElement("[data-testid='toggleable-element']");

    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    const isVisible = await reactGrab.isSelectionBoxVisible();
    expect(isVisible).toBe(true);
  });

  test("selection should recalculate after scroll", async ({ reactGrab }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("li:first-child");
    await reactGrab.waitForSelectionBox();

    const boundsBefore = await reactGrab.getSelectionBoxBounds();

    await reactGrab.scrollPage(50);

    if (boundsBefore) {
      await expect.poll(async () => {
        const bounds = await reactGrab.getSelectionBoxBounds();
        return bounds?.y;
      }).not.toBe(boundsBefore.y);
    }
  });

  test("multiple selection boxes should display for drag selection", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");

    await expect.poll(async () => {
      const info = await reactGrab.getGrabbedBoxInfo();
      return info.count;
    }).toBeGreaterThan(1);
  });

  test("selection should work on deeply nested elements", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    await reactGrab.hoverElement("[data-testid='deeply-nested-text']");
    await reactGrab.waitForSelectionBox();

    await reactGrab.clickElement("[data-testid='deeply-nested-text']");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("deeply nested");
  });
});
