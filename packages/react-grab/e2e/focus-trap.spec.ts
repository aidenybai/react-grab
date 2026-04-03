import { test, expect } from "./fixtures.js";

const FOCUS_TRAP_CONTAINER_ID = "focus-trap-test-container";

const injectFocusTrap = async (page: import("@playwright/test").Page) => {
  await page.evaluate((containerId) => {
    const container = document.createElement("div");
    container.id = containerId;
    container.innerHTML = `
      <div id="focus-trap-modal" style="
        position: fixed; bottom: 16px; right: 16px;
        width: 400px; padding: 24px; background: white; border: 2px solid #333;
        border-radius: 8px; z-index: 9000; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <h2>Focus-trapped Modal</h2>
        <input id="trap-input-1" type="text" placeholder="First input" style="display:block; margin: 8px 0; padding: 8px; width: 100%;" />
        <input id="trap-input-2" type="text" placeholder="Second input" style="display:block; margin: 8px 0; padding: 8px; width: 100%;" />
        <button id="trap-button" style="padding: 8px 16px; margin-top: 8px;">Trapped Button</button>
      </div>
      <div id="focus-trap-backdrop" style="
        position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 8999;
      "></div>
    `;
    document.body.appendChild(container);

    const modal = document.getElementById("focus-trap-modal")!;
    const focusableSelector =
      'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () =>
      Array.from(modal.querySelectorAll(focusableSelector)) as HTMLElement[];

    const focusInHandler = (event: FocusEvent) => {
      const target = event.target as Node;
      if (!modal.contains(target)) {
        event.stopImmediatePropagation();
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    };
    document.addEventListener("focusin", focusInHandler, true);

    const keydownHandler = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };
    document.addEventListener("keydown", keydownHandler, true);

    (window as { __FOCUS_TRAP_CLEANUP__?: () => void }).__FOCUS_TRAP_CLEANUP__ = () => {
      document.removeEventListener("focusin", focusInHandler, true);
      document.removeEventListener("keydown", keydownHandler, true);
    };

    const firstInput = document.getElementById("trap-input-1");
    firstInput?.focus();
  }, FOCUS_TRAP_CONTAINER_ID);
};

const removeFocusTrap = async (page: import("@playwright/test").Page) => {
  await page.evaluate((containerId) => {
    (window as { __FOCUS_TRAP_CLEANUP__?: () => void }).__FOCUS_TRAP_CLEANUP__?.();
    document.getElementById(containerId)?.remove();
  }, FOCUS_TRAP_CONTAINER_ID);
};

test.describe("Focus Trap Resistance", () => {
  test.afterEach(async ({ reactGrab }) => {
    await removeFocusTrap(reactGrab.page);
  });

  test.describe("Activation", () => {
    test("should activate via API while focus trap is active", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(true);
    });

    test("should deactivate with Escape while focus trap is active", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();
      await reactGrab.deactivate();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(false);
    });
  });

  test.describe("Element Selection", () => {
    test("should hover and select elements behind focus trap backdrop", async ({ reactGrab }) => {
      await reactGrab.activate();
      await injectFocusTrap(reactGrab.page);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should select elements inside the focus-trapped modal", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("#trap-button");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should update selection when hovering different elements", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("#trap-input-1");
      await reactGrab.waitForSelectionBox();
      const bounds1 = await reactGrab.getSelectionBoxBounds();

      await reactGrab.hoverElement("#trap-button");
      await reactGrab.waitForSelectionBox();
      const bounds2 = await reactGrab.getSelectionBoxBounds();

      if (bounds1 && bounds2) {
        const didSelectionChange = bounds1.y !== bounds2.y || bounds1.height !== bounds2.height;
        expect(didSelectionChange).toBe(true);
      }
    });
  });

  test.describe("Copy", () => {
    test("should copy element while focus trap is active", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("#trap-button");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("#trap-button");

      await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 2000 }).toBeTruthy();
    });

    test("should copy element outside modal while focus trap is active", async ({ reactGrab }) => {
      await reactGrab.activate();
      await injectFocusTrap(reactGrab.page);

      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();
      await reactGrab.clickElement("h1");

      await expect.poll(() => reactGrab.getClipboardContent(), { timeout: 2000 }).toBeTruthy();
    });
  });

  test.describe("Prompt Mode", () => {
    test("should enter prompt mode while focus trap is active", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await injectFocusTrap(reactGrab.page);

      await reactGrab.enterPromptMode("li:first-child");

      const isPromptMode = await reactGrab.isPromptModeActive();
      expect(isPromptMode).toBe(true);
    });

    test("textarea should receive typed input despite focus trap", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await injectFocusTrap(reactGrab.page);

      await reactGrab.enterPromptMode("li:first-child");
      await reactGrab.typeInInput("Hello from inside focus trap");

      const inputValue = await reactGrab.getInputValue();
      expect(inputValue).toBe("Hello from inside focus trap");
    });

    test("should submit prompt while focus trap is active", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent({ delay: 100 });
      await injectFocusTrap(reactGrab.page);

      await reactGrab.enterPromptMode("li:first-child");
      await reactGrab.typeInInput("Test prompt");
      await reactGrab.submitInput();

      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(false);
    });

    test("Escape should dismiss prompt mode despite focus trap", async ({ reactGrab }) => {
      await reactGrab.setupMockAgent();
      await injectFocusTrap(reactGrab.page);

      await reactGrab.enterPromptMode("li:first-child");
      await reactGrab.pressEscape();
      await reactGrab.pressEscape();

      await expect.poll(() => reactGrab.isOverlayVisible(), { timeout: 5000 }).toBe(false);
    });
  });

  test.describe("Context Menu", () => {
    test("should open context menu while focus trap is active", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("#trap-button");
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement("#trap-button");

      const isVisible = await reactGrab.isContextMenuVisible();
      expect(isVisible).toBe(true);
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("arrow key navigation should work while focus trap is active", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.pressArrowDown();
      await reactGrab.waitForSelectionBox();

      const isActive = await reactGrab.isOverlayVisible();
      const isSelectionVisible = await reactGrab.isSelectionBoxVisible();
      expect(isActive).toBe(true);
      expect(isSelectionVisible).toBe(true);
    });

    test("Escape should deactivate from selection while focus trap is active", async ({
      reactGrab,
    }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await reactGrab.deactivate();

      const isActive = await reactGrab.isOverlayVisible();
      expect(isActive).toBe(false);
    });
  });

  test.describe("Focus Trap Lifecycle", () => {
    test("should continue working after focus trap is removed", async ({ reactGrab }) => {
      await injectFocusTrap(reactGrab.page);
      await reactGrab.activate();

      await reactGrab.hoverElement("#trap-button");
      await reactGrab.waitForSelectionBox();

      await removeFocusTrap(reactGrab.page);
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });

    test("should work when focus trap appears after activation", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement("li:first-child");
      await reactGrab.waitForSelectionBox();

      await injectFocusTrap(reactGrab.page);
      await reactGrab.page.waitForTimeout(100);

      await reactGrab.hoverElement("h1");
      await reactGrab.waitForSelectionBox();

      const isVisible = await reactGrab.isSelectionBoxVisible();
      expect(isVisible).toBe(true);
    });
  });
});
