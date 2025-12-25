import { test, expect } from "./fixtures.js";

test.describe("Activation Flows", () => {
  test("should activate overlay via API", async ({ reactGrab }) => {
    const isVisibleBefore = await reactGrab.isOverlayVisible();
    expect(isVisibleBefore).toBe(false);

    await reactGrab.activate();

    const isVisibleAfter = await reactGrab.isOverlayVisible();
    expect(isVisibleAfter).toBe(true);
  });

  test("should not activate when pressing C without Cmd/Ctrl modifier", async ({
    reactGrab,
  }) => {
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(50);
    await reactGrab.page.keyboard.up("c");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should deactivate overlay when pressing Escape", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.deactivate();

    expect(await reactGrab.isOverlayVisible()).toBe(false);
  });

  test("should toggle activation state with repeated activation", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.pressEscape();
    await reactGrab.page.waitForTimeout(100);
    expect(await reactGrab.isOverlayVisible()).toBe(false);

    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should maintain activation during mouse movement", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.page.mouse.move(100, 100);
    await reactGrab.page.mouse.move(200, 200);
    await reactGrab.page.mouse.move(300, 300);

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should create overlay host element with correct attribute", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    const hostExists = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      return host !== null && host.getAttribute("data-react-grab") === "true";
    });
    expect(hostExists).toBe(true);
  });

  test("should have shadow DOM structure", async ({ reactGrab }) => {
    await reactGrab.activate();

    const hasShadowRoot = await reactGrab.page.evaluate(() => {
      const host = document.querySelector("[data-react-grab]");
      return host?.shadowRoot !== null;
    });

    expect(hasShadowRoot).toBe(true);
  });
});
