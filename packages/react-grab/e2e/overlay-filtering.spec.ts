import { test, expect, type ReactGrabPageObject } from "./fixtures.js";

test.describe("Overlay Filtering", () => {
  test.describe("React-grab elements should not be selectable", () => {
    test("should not select react-grab host element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      const selectedElement = await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => { targetElement: Element | null };
            };
          }
        ).__REACT_GRAB__;
        const state = api?.getState();
        return state?.targetElement?.hasAttribute("data-react-grab") ?? false;
      });

      expect(selectedElement).toBe(false);
    });

    test("should not select elements inside react-grab shadow DOM", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      const isInsideShadowDom = await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => { targetElement: Element | null };
            };
          }
        ).__REACT_GRAB__;
        const state = api?.getState();
        const target = state?.targetElement;
        if (!target) return false;

        const rootNode = target.getRootNode();
        if (rootNode instanceof ShadowRoot) {
          return rootNode.host.hasAttribute("data-react-grab");
        }
        return false;
      });

      expect(isInsideShadowDom).toBe(false);
    });

    test("should select page elements through react-grab overlay", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("li:first-child");

      const tagName = await reactGrab.page.evaluate(() => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => { targetElement: Element | null };
            };
          }
        ).__REACT_GRAB__;
        const state = api?.getState();
        return state?.targetElement?.tagName?.toLowerCase() ?? null;
      });

      expect(tagName).toBe("li");
    });
  });

  test.describe("Selection ignores react-grab UI components", () => {
    test("hovering over toolbar area should still select underlying element", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();

      const toolbarInfo = await reactGrab.getToolbarInfo();
      if (toolbarInfo.position) {
        await reactGrab.page.mouse.move(toolbarInfo.position.x + 10, toolbarInfo.position.y + 10);
        await reactGrab.page.waitForTimeout(200);

        const state = await reactGrab.getState();
        expect(state.isActive).toBe(true);
      }
    });

    test("clicking through overlay should copy correct element", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverUntilSelected("[data-testid='todo-list'] h1");
      await reactGrab.clickElement("[data-testid='todo-list'] h1");

      await expect.poll(() => reactGrab.getClipboardContent()).toContain("Todo List");
    });

    test("drag selection should work through overlay canvas", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.dragSelect("li:first-child", "li:nth-child(3)");
      await reactGrab.page.waitForTimeout(500);

      const grabbedInfo = await reactGrab.getGrabbedBoxInfo();
      expect(grabbedInfo.count).toBeGreaterThan(1);
    });
  });

  test.describe("Full-viewport overlay heuristics", () => {
    const injectOverlay = async (reactGrab: ReactGrabPageObject, style: Record<string, string>) => {
      await reactGrab.page.evaluate((overlayStyle) => {
        const overlay = document.createElement("div");
        overlay.setAttribute("data-testid", "injected-overlay");
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        Object.assign(overlay.style, overlayStyle);
        document.body.appendChild(overlay);
      }, style);
    };

    test("should skip a transparent full-viewport fixed overlay", async ({ reactGrab }) => {
      await injectOverlay(reactGrab, { backgroundColor: "transparent" });
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='main-title']");

      await expect.poll(reactGrab.getTargetTestId, { timeout: 3_000 }).toBe("main-title");
    });

    test("should skip a dev-tools style pointer-events-none overlay", async ({ reactGrab }) => {
      await injectOverlay(reactGrab, {
        backgroundColor: "rgb(255, 0, 0)",
        opacity: "0.5",
        pointerEvents: "none",
        zIndex: "2147483646",
      });
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='main-title']");

      await expect.poll(reactGrab.getTargetTestId, { timeout: 3_000 }).toBe("main-title");
    });

    test("should skip an opaque full-viewport overlay above the z-index threshold", async ({
      reactGrab,
    }) => {
      await injectOverlay(reactGrab, {
        backgroundColor: "rgba(255, 0, 0, 0.5)",
        zIndex: "2000",
      });
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='main-title']");

      await expect.poll(reactGrab.getTargetTestId, { timeout: 3_000 }).toBe("main-title");
    });

    test("should select an opaque full-viewport overlay with a low z-index", async ({
      reactGrab,
    }) => {
      await injectOverlay(reactGrab, {
        backgroundColor: "rgb(240, 240, 240)",
        zIndex: "1",
      });
      await reactGrab.activate();

      await reactGrab.hoverElement("[data-testid='main-title']");

      await expect.poll(reactGrab.getTargetTestId, { timeout: 3_000 }).toBe("injected-overlay");
    });

    test("should select a transparent overlay below the viewport coverage threshold", async ({
      reactGrab,
    }) => {
      await injectOverlay(reactGrab, {
        backgroundColor: "transparent",
        width: "85vw",
        height: "85vh",
      });
      await reactGrab.activate();

      await reactGrab.page.mouse.move(50, 50);

      await expect.poll(reactGrab.getTargetTestId, { timeout: 3_000 }).toBe("injected-overlay");
    });
  });

  test.describe("Shadow DOM isolation", () => {
    test("should only filter elements inside react-grab shadow DOM", async ({ reactGrab }) => {
      const shadowHostExists = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        return host !== null && host.shadowRoot !== null;
      });

      expect(shadowHostExists).toBe(true);

      await reactGrab.activate();

      const isReactGrabHostFiltered = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        if (!host) return false;

        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => { targetElement: Element | null };
            };
          }
        ).__REACT_GRAB__;
        const state = api?.getState();
        return state?.targetElement !== host;
      });

      expect(isReactGrabHostFiltered).toBe(true);
    });

    test("should verify react-grab host has correct attribute", async ({ reactGrab }) => {
      const hostHasAttribute = await reactGrab.page.evaluate(() => {
        const host = document.querySelector("[data-react-grab]");
        return host?.hasAttribute("data-react-grab") ?? false;
      });

      expect(hostHasAttribute).toBe(true);
    });
  });
});
