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

test.describe("Activation Mode Configuration", () => {
  test("toggle mode should activate on first keyboard activation", async ({
    reactGrab,
  }) => {
    await reactGrab.activateViaKeyboard();
    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("API toggle should deactivate on second call", async ({
    reactGrab,
  }) => {
    await reactGrab.toggle();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.page.waitForTimeout(200);
    await reactGrab.toggle();
    expect(await reactGrab.isOverlayVisible()).toBe(false);
  });

  test("keyboard activation in toggle mode requires Escape to deactivate", async ({
    reactGrab,
  }) => {
    await reactGrab.activateViaKeyboard();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.pressEscape();
    await reactGrab.page.waitForTimeout(100);
    expect(await reactGrab.isOverlayVisible()).toBe(false);
  });

  test("should not activate when focused on input element", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-input']");
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.keyboard.down("Meta");
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(300);
    await reactGrab.page.keyboard.up("c");
    await reactGrab.page.keyboard.up("Meta");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("should not activate when focused on textarea", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-textarea']");
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.keyboard.down("Meta");
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(300);
    await reactGrab.page.keyboard.up("c");
    await reactGrab.page.keyboard.up("Meta");

    const isVisible = await reactGrab.isOverlayVisible();
    expect(isVisible).toBe(false);
  });

  test("activation should work after clicking outside input", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-input']");
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.page.click("body", { position: { x: 10, y: 10 } });
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.activateViaKeyboard();
    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("API activation should work even when input is focused", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-input']");
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.activate();

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should handle activation during page scroll", async ({
    reactGrab,
  }) => {
    await reactGrab.scrollPage(200);
    await reactGrab.page.waitForTimeout(100);

    await reactGrab.activate();

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should remain activated after viewport resize", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.setViewportSize(1024, 768);
    await reactGrab.page.waitForTimeout(200);

    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.setViewportSize(1280, 720);
  });

  test("activation state should survive DOM changes", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.page.evaluate(() => {
      const newDiv = document.createElement("div");
      newDiv.textContent = "Dynamic content";
      document.body.appendChild(newDiv);
    });
    await reactGrab.page.waitForTimeout(100);

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should handle multiple rapid API toggle calls", async ({
    reactGrab,
  }) => {
    for (let i = 0; i < 5; i++) {
      await reactGrab.toggle();
      await reactGrab.page.waitForTimeout(30);
    }

    const state = await reactGrab.getState();
    expect(typeof state.isActive).toBe("boolean");
  });
});
