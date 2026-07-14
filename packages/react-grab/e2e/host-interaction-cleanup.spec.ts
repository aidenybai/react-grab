import { expect, test } from "./fixtures.js";
import { HOST_STYLE_DRAG_DISTANCE_PX, HOST_STYLE_DRAG_STEP_COUNT } from "./constants.js";

test("restores host body interaction styles after drag deactivation", async ({ reactGrab }) => {
  await reactGrab.page.evaluate(() => {
    document.body.style.userSelect = "text";
    document.body.style.touchAction = "pan-y";
  });

  await reactGrab.activate();
  await expect
    .poll(() => reactGrab.page.evaluate(() => document.body.style.touchAction))
    .toBe("none");

  const targetBounds = await reactGrab.page.locator("li").first().boundingBox();
  if (!targetBounds) throw new Error("Could not get target bounds");

  const startX = targetBounds.x + targetBounds.width / 2;
  const startY = targetBounds.y + targetBounds.height / 2;
  await reactGrab.page.mouse.move(startX, startY);
  await reactGrab.page.mouse.down();
  await reactGrab.page.mouse.move(startX + HOST_STYLE_DRAG_DISTANCE_PX, startY, {
    steps: HOST_STYLE_DRAG_STEP_COUNT,
  });
  await expect.poll(() => reactGrab.getDragBoxBounds()).not.toBeNull();

  await reactGrab.deactivate();
  await reactGrab.page.mouse.up();

  const restoredStyles = await reactGrab.page.evaluate(() => ({
    userSelect: document.body.style.userSelect,
    touchAction: document.body.style.touchAction,
  }));
  expect(restoredStyles).toEqual({ userSelect: "text", touchAction: "pan-y" });

  await reactGrab.page.evaluate(() => {
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
  });
});
