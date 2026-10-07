import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.js";

interface ShieldPanelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ScrollState {
  container: number;
  window: number;
}

const readShieldPanelRects = (page: Page): Promise<ShieldPanelRect[] | null> =>
  page.evaluate(() => {
    const container = document.querySelector("[data-react-grab-hit-test-shield]");
    if (!container) return null;
    return [...container.children].map((panel) => {
      const rect = panel.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });
  });

const isPointCovered = (panelRects: ShieldPanelRect[], pointX: number, pointY: number): boolean =>
  panelRects.some(
    (rect) =>
      pointX >= rect.left && pointX <= rect.right && pointY >= rect.top && pointY <= rect.bottom,
  );

const readScrollState = (page: Page): Promise<ScrollState> =>
  page.evaluate(() => ({
    container: document.querySelector('[data-testid="scroll-container"]')?.scrollTop ?? -1,
    window: window.scrollY,
  }));

test.describe("Hit Test Shield", () => {
  // The shield covers the viewport, so a wheel event targets the shield and the
  // browser would scroll the page instead of the container under the pointer.
  test("should scroll the container under the pointer, not the page", async ({
    reactGrab,
    page,
  }) => {
    const container = page.getByTestId("scroll-container");
    await container.scrollIntoViewIfNeeded();
    const containerBox = await container.boundingBox();
    expect(containerBox).not.toBeNull();
    if (!containerBox) return;

    await reactGrab.activate();
    await page.mouse.move(
      containerBox.x + containerBox.width / 2,
      containerBox.y + containerBox.height / 2,
      { steps: 3 },
    );

    const beforeScroll = await readScrollState(page);
    await page.mouse.wheel(0, 300);
    await expect
      .poll(async () => (await readScrollState(page)).container)
      .toBeGreaterThan(beforeScroll.container);
    expect((await readScrollState(page)).window).toBe(beforeScroll.window);
  });

  test("should leave page scrolling native when nothing under the pointer scrolls", async ({
    reactGrab,
    page,
  }) => {
    const heading = page.getByRole("heading", { level: 1 }).first();
    await heading.scrollIntoViewIfNeeded();
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();
    if (!headingBox) return;

    await reactGrab.activate();
    await page.mouse.move(
      headingBox.x + headingBox.width / 2,
      headingBox.y + headingBox.height / 2,
      { steps: 3 },
    );

    const beforeScroll = await readScrollState(page);
    await page.mouse.wheel(0, 300);
    await expect
      .poll(async () => (await readScrollState(page)).window)
      .toBeGreaterThan(beforeScroll.window);
  });

  test("should cut a hole for a same-origin frame that covers the viewport", async ({
    reactGrab,
  }) => {
    const page = reactGrab.page;
    await page.evaluate(async () => {
      const iframeElement = document.createElement("iframe");
      iframeElement.dataset.testid = "full-viewport-iframe";
      iframeElement.srcdoc = `<body style="margin:0;height:400vh">full viewport frame</body>`;
      iframeElement.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;border:0";
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      document.body.append(iframeElement);
      await didLoad;
    });

    await page.evaluate(() => window.freezeReactGrab());

    const viewportSize = page.viewportSize();
    expect(viewportSize).not.toBeNull();
    if (!viewportSize) return;

    await expect
      .poll(async () => {
        const panelRects = await readShieldPanelRects(page);
        if (!panelRects) return null;
        return isPointCovered(panelRects, viewportSize.width / 2, viewportSize.height / 2);
      })
      .toBe(false);

    await page.evaluate(() => {
      window.unfreezeReactGrab();
      document.querySelector('[data-testid="full-viewport-iframe"]')?.remove();
    });
  });

  test("should cut a hole for a same-origin frame inside a shadow root", async ({ reactGrab }) => {
    const page = reactGrab.page;
    const frameBox = await page.evaluate(async () => {
      const hostElement = document.createElement("div");
      const shadowRoot = hostElement.attachShadow({ mode: "open" });
      const iframeElement = document.createElement("iframe");
      iframeElement.srcdoc = `<body style="margin:0;height:400vh">shadow frame</body>`;
      iframeElement.style.cssText =
        "position:fixed;left:40px;top:40px;width:200px;height:150px;border:0";
      const didLoad = new Promise<void>((resolve) => {
        iframeElement.addEventListener("load", () => resolve(), { once: true });
      });
      shadowRoot.append(iframeElement);
      document.body.append(hostElement);
      hostElement.dataset.testid = "shadow-frame-host";
      await didLoad;
      const rect = iframeElement.getBoundingClientRect();
      return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
    });

    await page.evaluate(() => window.freezeReactGrab());

    await expect
      .poll(async () => {
        const panelRects = await readShieldPanelRects(page);
        if (!panelRects || panelRects.length === 0) return null;
        return isPointCovered(panelRects, frameBox.centerX, frameBox.centerY);
      })
      .toBe(false);

    await page.evaluate(() => {
      window.unfreezeReactGrab();
      document.querySelector('[data-testid="shadow-frame-host"]')?.remove();
    });
  });
});
