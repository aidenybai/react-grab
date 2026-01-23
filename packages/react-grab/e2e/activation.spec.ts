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

    await reactGrab.deactivate();
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

  test("API toggle should deactivate on second call", async ({ reactGrab }) => {
    await reactGrab.toggle();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.toggle();
    expect(await reactGrab.isOverlayVisible()).toBe(false);
  });

  test("keyboard activation in toggle mode requires Escape to deactivate", async ({
    reactGrab,
  }) => {
    await reactGrab.activateViaKeyboard();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.deactivate();
    expect(await reactGrab.isOverlayVisible()).toBe(false);
  });

  test("should activate when focused on input element", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-input']");

    await reactGrab.page.keyboard.down("Meta");
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(350);
    await reactGrab.page.keyboard.up("c");
    await reactGrab.page.keyboard.up("Meta");

    await expect
      .poll(() => reactGrab.isOverlayVisible(), { timeout: 1000 })
      .toBe(true);
  });

  test("should activate when focused on textarea", async ({ reactGrab }) => {
    await reactGrab.page.click("[data-testid='test-textarea']");

    await reactGrab.page.keyboard.down("Meta");
    await reactGrab.page.keyboard.down("c");
    await reactGrab.page.waitForTimeout(350);
    await reactGrab.page.keyboard.up("c");
    await reactGrab.page.keyboard.up("Meta");

    await expect
      .poll(() => reactGrab.isOverlayVisible(), { timeout: 1000 })
      .toBe(true);
  });

  test("activation should work after clicking outside input", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-input']");
    await reactGrab.page.click("body", { position: { x: 10, y: 10 } });

    await reactGrab.activateViaKeyboard();
    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("API activation should work even when input is focused", async ({
    reactGrab,
  }) => {
    await reactGrab.page.click("[data-testid='test-input']");

    await reactGrab.activate();

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should handle activation during page scroll", async ({ reactGrab }) => {
    await reactGrab.scrollPage(200);

    await reactGrab.activate();

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should remain activated after viewport resize", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.setViewportSize(1024, 768);

    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.setViewportSize(1280, 720);
  });

  test("activation state should survive DOM changes", async ({ reactGrab }) => {
    await reactGrab.activate();
    expect(await reactGrab.isOverlayVisible()).toBe(true);

    await reactGrab.page.evaluate(() => {
      const newDiv = document.createElement("div");
      newDiv.textContent = "Dynamic content";
      document.body.appendChild(newDiv);
    });

    expect(await reactGrab.isOverlayVisible()).toBe(true);
  });

  test("should handle multiple rapid API toggle calls", async ({
    reactGrab,
  }) => {
    for (let i = 0; i < 5; i++) {
      await reactGrab.toggle();
    }

    const state = await reactGrab.getState();
    expect(typeof state.isActive).toBe("boolean");
  });

  test("should activate via Cmd+C during native browser drag", async ({
    reactGrab,
  }) => {
    await reactGrab.page.evaluate(() => {
      const draggable = document.createElement("div");
      draggable.id = "native-draggable";
      draggable.draggable = true;
      draggable.textContent = "Drag me";
      draggable.style.cssText =
        "width: 100px; height: 50px; background: #ccc; padding: 10px;";
      document.body.appendChild(draggable);
    });

    const draggable = reactGrab.page.locator("#native-draggable");
    const box = await draggable.boundingBox();
    if (!box) throw new Error("Could not get draggable bounds");

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await reactGrab.page.mouse.move(startX, startY);

    await reactGrab.page.evaluate(() => {
      const element = document.getElementById("native-draggable");
      if (!element) return;
      element.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true }),
      );
    });

    await reactGrab.page.evaluate(() => {
      document.dispatchEvent(new ClipboardEvent("copy", { bubbles: true }));
    });

    await expect
      .poll(() => reactGrab.isOverlayVisible(), { timeout: 1000 })
      .toBe(true);

    await reactGrab.page.evaluate(() => {
      const element = document.getElementById("native-draggable");
      if (!element) return;
      element.dispatchEvent(
        new DragEvent("dragend", { bubbles: true, cancelable: true }),
      );
    });
  });
});
