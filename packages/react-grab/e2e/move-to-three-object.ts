import { expect, type Page } from "@playwright/test";
import { THREE_CANVAS_VERTICAL_CENTER_RATIO, THREE_OBJECT_POINTER_NUDGE_PX } from "./constants.js";

export interface CanvasPointerPosition {
  x: number;
  y: number;
}

export const moveToThreeObject = async (
  page: Page,
  canvasTestId: string,
  horizontalRatio: number,
): Promise<CanvasPointerPosition> => {
  const canvas = page.getByTestId(canvasTestId);
  await canvas.scrollIntoViewIfNeeded();
  const canvasBounds = await canvas.boundingBox();
  if (!canvasBounds) throw new Error(`${canvasTestId} has no bounds`);
  const pointerPosition = {
    x: canvasBounds.x + canvasBounds.width * horizontalRatio,
    y: canvasBounds.y + canvasBounds.height * THREE_CANVAS_VERTICAL_CENTER_RATIO,
  };
  await expect
    .poll(async () => {
      await page.mouse.move(pointerPosition.x - THREE_OBJECT_POINTER_NUDGE_PX, pointerPosition.y);
      await page.mouse.move(pointerPosition.x, pointerPosition.y);
      return page.evaluate(
        () => window.__REACT_GRAB__?.getState().targetElement?.tagName.toLowerCase() ?? null,
      );
    })
    .toBe("mesh");
  return pointerPosition;
};
