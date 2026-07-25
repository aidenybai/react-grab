import { expect, test } from "./fixtures.js";
import { moveToThreeObject } from "./move-to-three-object.js";
import {
  THREE_CANVAS_HORIZONTAL_CENTER_RATIO,
  THREE_LEFT_OBJECT_HORIZONTAL_RATIO,
  THREE_RIGHT_OBJECT_HORIZONTAL_RATIO,
  THREE_SELECTION_MAX_CANVAS_WIDTH_RATIO,
  THREE_CANVAS_VERTICAL_CENTER_RATIO,
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

  test("includes shader material context for points", async ({ reactGrab, page }) => {
    await reactGrab.activate();
    const pointerPosition = await moveToThreeObject(
      page,
      "three-js-canvas",
      THREE_CANVAS_VERTICAL_CENTER_RATIO,
      "points",
    );
    await page.mouse.click(pointerPosition.x, pointerPosition.y);

    await expect
      .poll(() => reactGrab.getClipboardContent())
      .toContain('<points name="three-js-shader-point">');
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain('<shaderMaterial uniforms={["uColor","uPointSize"]}');
    expect(clipboardContent).toContain('defines={["USE_TINT"]}');
    expect(clipboardContent).toContain("uniform float uPointSize;");
    expect(clipboardContent).toContain("uniform vec3 uColor;");
  });

  test("grabs shader particles in the standalone scene", async ({ reactGrab, page }) => {
    await page.goto("/particle-shader.html", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start React Grab" }).click();
    await expect.poll(() => reactGrab.getState().then((state) => state.isActive)).toBe(true);
    const pointerPosition = await moveToThreeObject(
      page,
      "particle-shader-canvas",
      THREE_CANVAS_HORIZONTAL_CENTER_RATIO,
      "points",
    );
    await page.mouse.click(pointerPosition.x, pointerPosition.y);

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("<points name=");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("<shaderMaterial");
    expect(clipboardContent).toContain("uniform float uTime;");
  });
});
