import { test, expect } from "./fixtures.js";

test.describe("Shift Multi-Select", () => {
  test("should accumulate multiple elements via shift+click and copy on shift release", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const lastItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(6);

    const firstBox = await firstItem.boundingBox();
    const lastBox = await lastItem.boundingBox();
    if (!firstBox || !lastBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
    await reactGrab.page.waitForTimeout(100);

    const stateWhileHoldingShift = await reactGrab.getState();
    expect(stateWhileHoldingShift.isActive).toBe(true);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Write tests");
  });

  test("should toggle element off when shift+clicking it twice", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    if (!firstBox || !secondBox) throw new Error("Could not get bounding boxes");

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Walk the dog");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).not.toContain("Buy groceries");
  });

  test("should not auto-copy until shift is released", async ({ reactGrab }) => {
    await reactGrab.page.evaluate(() => navigator.clipboard.writeText("baseline"));
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(400);

    const clipboardWhileShiftHeld = await reactGrab.getClipboardContent();
    expect(clipboardWhileShiftHeld).toBe("baseline");

    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
  });

  test("should extend existing drag selection with shift+click", async ({ reactGrab }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const secondItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(1);
    const lastItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(6);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();
    const lastBox = await lastItem.boundingBox();
    if (!firstBox || !secondBox || !lastBox) {
      throw new Error("Could not get bounding boxes");
    }

    await reactGrab.page.keyboard.down("Shift");

    await reactGrab.page.mouse.move(firstBox.x - 10, firstBox.y - 10);
    await reactGrab.page.mouse.down();
    await reactGrab.page.mouse.move(
      secondBox.x + secondBox.width + 10,
      secondBox.y + secondBox.height + 10,
      { steps: 8 },
    );
    await reactGrab.page.mouse.up();
    await reactGrab.page.waitForTimeout(150);

    await reactGrab.page.mouse.click(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
    await reactGrab.page.waitForTimeout(150);

    await reactGrab.page.keyboard.up("Shift");

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("Buy groceries");
    const clipboardContent = await reactGrab.getClipboardContent();
    expect(clipboardContent).toContain("Write tests");
  });
});
