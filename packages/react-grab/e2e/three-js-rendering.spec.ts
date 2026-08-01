import { expect, test } from "./fixtures.js";
import {
  THREE_JS_FRAME_COUNT_WINDOW_PROPERTY,
  THREE_RENDER_FREEZE_OBSERVATION_MS,
  THREE_RENDER_FREEZE_SETTLE_MS,
} from "./constants.js";

test.describe("Three.js rendering", () => {
  test("automatically pauses and resumes the render loop", async ({ reactGrab, page }) => {
    const readFrameCount = () =>
      page.evaluate((frameCountPropertyName) => {
        const frameCount = Reflect.get(window, frameCountPropertyName);
        return typeof frameCount === "number" ? frameCount : 0;
      }, THREE_JS_FRAME_COUNT_WINDOW_PROPERTY);

    await expect.poll(readFrameCount).toBeGreaterThan(0);
    await reactGrab.activate();
    await page.waitForTimeout(THREE_RENDER_FREEZE_SETTLE_MS);
    const frozenFrameCount = await readFrameCount();
    await page.waitForTimeout(THREE_RENDER_FREEZE_OBSERVATION_MS);
    expect(await readFrameCount()).toBe(frozenFrameCount);

    await reactGrab.deactivate();
    await expect.poll(readFrameCount).toBeGreaterThan(frozenFrameCount);

    await reactGrab.activate();
    await page.waitForTimeout(THREE_RENDER_FREEZE_SETTLE_MS);
    const secondFrozenFrameCount = await readFrameCount();
    await page.waitForTimeout(THREE_RENDER_FREEZE_OBSERVATION_MS);
    expect(await readFrameCount()).toBe(secondFrozenFrameCount);

    await reactGrab.deactivate();
    await expect.poll(readFrameCount).toBeGreaterThan(secondFrozenFrameCount);
  });
});
