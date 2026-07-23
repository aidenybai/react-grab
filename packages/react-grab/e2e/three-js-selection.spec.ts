import { expect, test } from "./fixtures.js";
import { moveToThreeObject } from "./move-to-three-object.js";
import {
  THREE_LEFT_OBJECT_HORIZONTAL_RATIO,
  THREE_RIGHT_OBJECT_HORIZONTAL_RATIO,
  THREE_SELECTION_MAX_CANVAS_WIDTH_RATIO,
} from "./constants.js";

test.describe("Three.js selection", () => {
  test("grabs an individual mesh with projected bounds", async ({ reactGrab, page }) => {
    await reactGrab.activate();
    const pointerPosition = await moveToThreeObject(
      page,
      "three-js-canvas",
      THREE_LEFT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();

    const selectionLabel = await reactGrab.getSelectionLabelInfo();
    expect(selectionLabel.tagName).toBe("mesh");

    const canvasBounds = await page.getByTestId("three-js-canvas").boundingBox();
    const selectionBounds = await reactGrab.getSelectionBoxBounds();
    if (!canvasBounds || !selectionBounds) throw new Error("Selection bounds were not rendered");
    expect(selectionBounds.width).toBeLessThan(
      canvasBounds.width * THREE_SELECTION_MAX_CANVAS_WIDTH_RATIO,
    );
    expect(selectionBounds.height).toBeLessThan(canvasBounds.height);

    await page.mouse.click(pointerPosition.x, pointerPosition.y);
    await expect
      .poll(() => reactGrab.getClipboardContent())
      .toContain('<mesh name="three-js-left-cube"');
  });

  test("distinguishes adjacent meshes and disables DOM-only style editing", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.activate();
    const pointerPosition = await moveToThreeObject(
      page,
      "three-js-canvas",
      THREE_RIGHT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickAtPosition(pointerPosition.x, pointerPosition.y);

    const contextMenuInfo = await reactGrab.getContextMenuInfo();
    expect(contextMenuInfo.tagBadgeText).toBe("mesh");
    expect(await reactGrab.isContextMenuItemEnabled("Style")).toBe(false);

    await reactGrab.clickContextMenuItem("Copy");
    await expect
      .poll(() => reactGrab.getClipboardContent())
      .toContain('<mesh name="three-js-right-cube"');
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).not.toContain('<mesh name="three-js-left-cube"');
  });
});
