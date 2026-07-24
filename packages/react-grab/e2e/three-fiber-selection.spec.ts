import { expect, test } from "./fixtures.js";
import { moveToThreeObject } from "./move-to-three-object.js";
import {
  THREE_FRAME_COUNT_WINDOW_PROPERTY,
  THREE_LEFT_OBJECT_HORIZONTAL_RATIO,
  THREE_RENDER_FREEZE_OBSERVATION_MS,
  THREE_RENDER_FREEZE_SETTLE_MS,
  THREE_RIGHT_OBJECT_HORIZONTAL_RATIO,
  THREE_SELECTION_MAX_CANVAS_WIDTH_RATIO,
} from "./constants.js";

test.describe("React Three Fiber selection", () => {
  test("pauses and resumes the render loop with React Grab", async ({ reactGrab, page }) => {
    const readFrameCount = () =>
      page.evaluate((propertyName) => {
        const frameCount = Reflect.get(window, propertyName);
        return typeof frameCount === "number" ? frameCount : 0;
      }, THREE_FRAME_COUNT_WINDOW_PROPERTY);

    await expect.poll(readFrameCount).toBeGreaterThan(0);
    await reactGrab.activate();
    await page.waitForTimeout(THREE_RENDER_FREEZE_SETTLE_MS);
    const frozenFrameCount = await readFrameCount();
    await page.waitForTimeout(THREE_RENDER_FREEZE_OBSERVATION_MS);
    expect(await readFrameCount()).toBe(frozenFrameCount);

    await reactGrab.deactivate();
    await expect.poll(readFrameCount).toBeGreaterThan(frozenFrameCount);
  });

  test("grabs an individual mesh with projected bounds and source context", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.activate();
    const pointerPosition = await moveToThreeObject(
      page,
      "three-fiber-canvas",
      THREE_LEFT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();

    const selectionLabel = await reactGrab.getSelectionLabelInfo();
    expect(selectionLabel.tagName).toBe("mesh");
    await reactGrab.waitForSelectionSource();

    const canvasBounds = await page.locator('[data-testid="three-fiber-canvas"]').boundingBox();
    const selectionBounds = await reactGrab.getSelectionBoxBounds();
    if (!canvasBounds || !selectionBounds) throw new Error("Selection bounds were not rendered");
    expect(selectionBounds.width).toBeLessThan(
      canvasBounds.width * THREE_SELECTION_MAX_CANVAS_WIDTH_RATIO,
    );
    expect(selectionBounds.height).toBeLessThan(canvasBounds.height);

    await page.mouse.click(pointerPosition.x, pointerPosition.y);
    await expect.poll(() => reactGrab.getClipboardContent()).toContain('<mesh name="left-cube"');
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("ThreeGrabBox");
  });

  test("distinguishes adjacent meshes and disables DOM-only style editing", async ({
    reactGrab,
    page,
  }) => {
    await reactGrab.activate();
    const pointerPosition = await moveToThreeObject(
      page,
      "three-fiber-canvas",
      THREE_RIGHT_OBJECT_HORIZONTAL_RATIO,
    );
    await reactGrab.waitForSelectionBox();
    await reactGrab.rightClickAtPosition(pointerPosition.x, pointerPosition.y);

    const contextMenuInfo = await reactGrab.getContextMenuInfo();
    expect(contextMenuInfo.tagBadgeText).toBe("ThreeGrabBox.mesh");
    expect(await reactGrab.isContextMenuItemEnabled("Style")).toBe(false);

    await reactGrab.clickContextMenuItem("Copy");
    await expect.poll(() => reactGrab.getClipboardContent()).toContain('<mesh name="right-cube"');
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).not.toContain('<mesh name="left-cube"');
  });
});
