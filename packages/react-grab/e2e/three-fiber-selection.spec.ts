import { expect, test } from "./fixtures.js";
import { moveToThreeObject } from "./move-to-three-object.js";
import {
  THREE_ELAPSED_TIME_WINDOW_PROPERTY,
  THREE_FRAME_COUNT_WINDOW_PROPERTY,
  THREE_LEFT_OBJECT_HORIZONTAL_RATIO,
  THREE_RENDER_FREEZE_OBSERVATION_MS,
  THREE_RENDER_FREEZE_SETTLE_MS,
  THREE_RIGHT_OBJECT_HORIZONTAL_RATIO,
  THREE_SELECTION_MAX_CANVAS_WIDTH_RATIO,
} from "./constants.js";

test.describe("React Three Fiber selection", () => {
  test("pauses and resumes the render loop without resetting its clock", async ({
    reactGrab,
    page,
  }) => {
    const readRenderingMetrics = () =>
      page.evaluate(
        ({ elapsedTimePropertyName, frameCountPropertyName }) => {
          const elapsedTime = Reflect.get(window, elapsedTimePropertyName);
          const frameCount = Reflect.get(window, frameCountPropertyName);
          return {
            elapsedTime: typeof elapsedTime === "number" ? elapsedTime : 0,
            frameCount: typeof frameCount === "number" ? frameCount : 0,
          };
        },
        {
          elapsedTimePropertyName: THREE_ELAPSED_TIME_WINDOW_PROPERTY,
          frameCountPropertyName: THREE_FRAME_COUNT_WINDOW_PROPERTY,
        },
      );

    await expect.poll(async () => (await readRenderingMetrics()).frameCount).toBeGreaterThan(0);
    const metricsBeforeFreeze = await readRenderingMetrics();
    await reactGrab.activate();
    await page.waitForTimeout(THREE_RENDER_FREEZE_SETTLE_MS);
    const frozenMetrics = await readRenderingMetrics();
    expect(frozenMetrics.elapsedTime).toBeGreaterThanOrEqual(metricsBeforeFreeze.elapsedTime);
    await page.waitForTimeout(THREE_RENDER_FREEZE_OBSERVATION_MS);
    expect(await readRenderingMetrics()).toEqual(frozenMetrics);

    await reactGrab.deactivate();
    await expect
      .poll(async () => (await readRenderingMetrics()).frameCount)
      .toBeGreaterThan(frozenMetrics.frameCount);
    expect((await readRenderingMetrics()).elapsedTime).toBeGreaterThanOrEqual(
      frozenMetrics.elapsedTime,
    );

    await reactGrab.activate();
    await page.waitForTimeout(THREE_RENDER_FREEZE_SETTLE_MS);
    const secondFrozenMetrics = await readRenderingMetrics();
    await page.waitForTimeout(THREE_RENDER_FREEZE_OBSERVATION_MS);
    expect(await readRenderingMetrics()).toEqual(secondFrozenMetrics);

    await reactGrab.deactivate();
    await expect
      .poll(async () => (await readRenderingMetrics()).frameCount)
      .toBeGreaterThan(secondFrozenMetrics.frameCount);
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
