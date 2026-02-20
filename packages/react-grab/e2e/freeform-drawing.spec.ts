import { test, expect } from "./fixtures.js";

const FREEFORM_IDLE_TIMEOUT_MS = 600;
const GESTURE_SETTLE_BUFFER_MS = 300;

test.describe("Freeform Drawing", () => {
  test("should enter comment mode via arrow gesture", async ({ reactGrab }) => {
    await reactGrab.activate();

    const listItem = reactGrab.page.locator("li").first();
    const box = await listItem.boundingBox();
    if (!box) throw new Error("Could not get bounding box");

    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.move(targetX - 150, targetY - 80);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(targetX, targetY, { steps: 20 });
    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Alt");

    await expect
      .poll(() => reactGrab.isPromptModeActive(), {
        timeout: FREEFORM_IDLE_TIMEOUT_MS + GESTURE_SETTLE_BUFFER_MS + 2000,
      })
      .toBe(true);
  });

  test("should enter comment mode via circle gesture", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("li").first();
    const thirdItem = reactGrab.page.locator("li").nth(2);
    const firstBox = await firstItem.boundingBox();
    const thirdBox = await thirdItem.boundingBox();
    if (!firstBox || !thirdBox)
      throw new Error("Could not get bounding boxes");

    const centerX = (firstBox.x + thirdBox.x + thirdBox.width) / 2;
    const centerY = (firstBox.y + thirdBox.y + thirdBox.height) / 2;
    const radiusX = (thirdBox.x + thirdBox.width - firstBox.x) / 2 + 30;
    const radiusY = (thirdBox.y + thirdBox.height - firstBox.y) / 2 + 30;

    const strokeSteps = 40;
    const totalAngle = Math.PI * 1.8;

    await reactGrab.page.keyboard.down("Alt");

    const startX = centerX + radiusX;
    const startY = centerY;
    await reactGrab.page.mouse.move(startX, startY);
    await reactGrab.page.mouse.down();

    for (let stepIndex = 1; stepIndex <= strokeSteps; stepIndex++) {
      const angle = (stepIndex / strokeSteps) * totalAngle;
      await reactGrab.page.mouse.move(
        centerX + radiusX * Math.cos(angle),
        centerY + radiusY * Math.sin(angle),
      );
    }

    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Alt");

    await expect
      .poll(() => reactGrab.isPromptModeActive(), {
        timeout: FREEFORM_IDLE_TIMEOUT_MS + GESTURE_SETTLE_BUFFER_MS + 2000,
      })
      .toBe(true);
  });

  test("should hide crosshair during freeform session", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.page.mouse.move(400, 300);
    await reactGrab.page.waitForTimeout(100);

    const crosshairBefore = await reactGrab.isCrosshairVisible();
    expect(crosshairBefore).toBe(true);

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.move(200, 200);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(300, 300, { steps: 10 });

    const crosshairDuring = await reactGrab.isCrosshairVisible();
    expect(crosshairDuring).toBe(false);

    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Alt");
  });

  test("should not start freeform when overlay is inactive", async ({
    reactGrab,
  }) => {
    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.move(300, 300);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(400, 400, { steps: 10 });
    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Alt");

    await reactGrab.page.waitForTimeout(
      FREEFORM_IDLE_TIMEOUT_MS + GESTURE_SETTLE_BUFFER_MS,
    );

    const state = await reactGrab.getState();
    expect(state.isActive).toBe(false);
  });

  test("should keep overlay active in comment mode after freeform gesture", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const listItem = reactGrab.page.locator("li").first();
    const box = await listItem.boundingBox();
    if (!box) throw new Error("Could not get bounding box");

    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.move(targetX - 150, targetY - 80);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(targetX, targetY, { steps: 20 });
    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Alt");

    await expect
      .poll(() => reactGrab.isPromptModeActive(), {
        timeout: FREEFORM_IDLE_TIMEOUT_MS + GESTURE_SETTLE_BUFFER_MS + 2000,
      })
      .toBe(true);

    const isActive = await reactGrab.isOverlayVisible();
    expect(isActive).toBe(true);
  });

  test("should discard gesture with insufficient points", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.move(300, 300);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(305, 305);
    await reactGrab.page.mouse.up();
    await reactGrab.page.keyboard.up("Alt");

    await reactGrab.page.waitForTimeout(
      FREEFORM_IDLE_TIMEOUT_MS + GESTURE_SETTLE_BUFFER_MS,
    );

    const isActive = await reactGrab.isOverlayVisible();
    expect(isActive).toBe(true);

    const isPromptMode = await reactGrab.isPromptModeActive();
    expect(isPromptMode).toBe(false);
  });
});
