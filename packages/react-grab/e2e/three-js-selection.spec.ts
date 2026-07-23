import { expect, test } from "./fixtures.js";
import { moveToThreeObject } from "./move-to-three-object.js";

const LEFT_OBJECT_HORIZONTAL_RATIO = 0.39;
const RIGHT_OBJECT_HORIZONTAL_RATIO = 0.61;

test.describe("Three.js selection", () => {
  test("grabs an individual mesh with projected bounds", async ({ reactGrab, page }) => {
    await reactGrab.activate();
    const position = await moveToThreeObject(page, "three-js-canvas", LEFT_OBJECT_HORIZONTAL_RATIO);
    await reactGrab.waitForSelectionBox();

    const label = await reactGrab.getSelectionLabelInfo();
    expect(label.tagName).toBe("mesh");

    const canvasBounds = await page.getByTestId("three-js-canvas").boundingBox();
    const selectionBounds = await reactGrab.getSelectionBoxBounds();
    if (!canvasBounds || !selectionBounds) throw new Error("Selection bounds were not rendered");
    expect(selectionBounds.width).toBeLessThan(canvasBounds.width / 2);
    expect(selectionBounds.height).toBeLessThan(canvasBounds.height);

    await page.mouse.click(position.x, position.y);
    await expect
      .poll(() => reactGrab.getClipboardContent())
      .toContain('<mesh name="three-js-left-cube"');
  });

  test("distinguishes adjacent meshes and disables DOM-only style editing", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.activate();
    const position = await moveToThreeObject(
      page,
      "three-js-canvas",
      RIGHT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickAtPosition(position.x, position.y);

    const contextMenu = await reactGrab.getContextMenuInfo();
    expect(contextMenu.tagBadgeText).toBe("mesh");
    expect(await reactGrab.isContextMenuItemEnabled("Style")).toBe(false);

    await reactGrab.clickContextMenuItem("Copy");
    await expect
      .poll(() => reactGrab.getClipboardContent())
      .toContain('<mesh name="three-js-right-cube"');
    const clipboard = await reactGrab.getClipboardContent();
    expect(clipboard).not.toContain('<mesh name="three-js-left-cube"');
  });
});
