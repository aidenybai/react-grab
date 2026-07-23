import { expect, type Page } from "@playwright/test";

export interface CanvasPosition {
  x: number;
  y: number;
}

export const moveToThreeObject = async (
  page: Page,
  canvasTestId: string,
  horizontalRatio: number,
): Promise<CanvasPosition> => {
  const canvas = page.getByTestId(canvasTestId);
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error(`${canvasTestId} has no bounds`);
  const position = {
    x: bounds.x + bounds.width * horizontalRatio,
    y: bounds.y + bounds.height / 2,
  };
  await expect
    .poll(async () => {
      await page.mouse.move(position.x - 1, position.y);
      await page.mouse.move(position.x, position.y);
      return page.evaluate(
        () => window.__REACT_GRAB__?.getState().targetElement?.tagName.toLowerCase() ?? null,
      );
    })
    .toBe("mesh");
  return position;
};
