import { expect, test } from "./fixtures.js";
import { moveToThreeObject } from "./move-to-three-object.js";

const LEFT_OBJECT_HORIZONTAL_RATIO = 0.39;
const RIGHT_OBJECT_HORIZONTAL_RATIO = 0.61;

test.describe("React Three Fiber selection", () => {
  test("grabs an individual mesh with projected bounds and source context", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.activate();
    const position = await moveToThreeObject(
      page,
      "three-fiber-canvas",
      LEFT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();

    const label = await reactGrab.getSelectionLabelInfo();
    expect(label.tagName).toBe("mesh");
    await reactGrab.waitForSelectionSource();

    const canvasBounds = await page.locator('[data-testid="three-fiber-canvas"]').boundingBox();
    const selectionBounds = await reactGrab.getSelectionBoxBounds();
    if (!canvasBounds || !selectionBounds) throw new Error("Selection bounds were not rendered");
    expect(selectionBounds.width).toBeLessThan(canvasBounds.width / 2);
    expect(selectionBounds.height).toBeLessThan(canvasBounds.height);

    await page.mouse.click(position.x, position.y);
    await expect.poll(() => reactGrab.getClipboardContent()).toContain('<mesh name="left-cube"');
    const clipboard = await reactGrab.getClipboardContent();
    expect(clipboard).toContain("ThreeGrabBox");
  });

  test("distinguishes adjacent meshes and disables DOM-only style editing", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.activate();
    const position = await moveToThreeObject(
      page,
      "three-fiber-canvas",
      RIGHT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickAtPosition(position.x, position.y);

    const contextMenu = await reactGrab.getContextMenuInfo();
    expect(contextMenu.tagBadgeText).toBe("ThreeGrabBox.mesh");
    expect(await reactGrab.isContextMenuItemEnabled("Style")).toBe(false);

    await reactGrab.clickContextMenuItem("Copy");
    await expect.poll(() => reactGrab.getClipboardContent()).toContain('<mesh name="right-cube"');
    const clipboard = await reactGrab.getClipboardContent();
    expect(clipboard).not.toContain('<mesh name="left-cube"');
  });
});
