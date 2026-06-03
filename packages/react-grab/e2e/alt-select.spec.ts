import { test, expect } from "./fixtures.js";

const TODO_ITEM_COUNT = 7;

test.describe("Alt Component-Instance Select", () => {
  test.describe.configure({ mode: "serial" });

  test("should select every instance of the clicked component when Alt is held", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const firstItem = reactGrab.page.locator("[data-testid='todo-list'] li").nth(0);
    const firstBox = await firstItem.boundingBox();
    if (!firstBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.click(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.page.keyboard.up("Alt");

    await expect
      .poll(async () => (await reactGrab.getLabelInstancesInfo()).length)
      .toBe(TODO_ITEM_COUNT);

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });

  test("should fall back to a single selection when no sibling instances exist", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const heading = reactGrab.page.locator("[data-testid='todo-list'] h1");
    const headingBox = await heading.boundingBox();
    if (!headingBox) throw new Error("Could not get bounding box");

    await reactGrab.page.keyboard.down("Alt");
    await reactGrab.page.mouse.click(
      headingBox.x + headingBox.width / 2,
      headingBox.y + headingBox.height / 2,
    );
    await reactGrab.page.waitForTimeout(150);
    await reactGrab.page.keyboard.up("Alt");

    await expect.poll(() => reactGrab.getClipboardContent()).not.toBe("");
  });
});
