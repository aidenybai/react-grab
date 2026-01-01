import { test as base, expect, Page, Locator } from "@playwright/test";

const ATTRIBUTE_NAME = "data-react-grab";
const DEFAULT_KEY_HOLD_DURATION_MS = 200;
const ACTIVATION_BUFFER_MS = 100;

interface ContextMenuInfo {
  isVisible: boolean;
  tagBadgeText: string | null;
  menuItems: string[];
  position: { x: number; y: number } | null;
}

interface ReactGrabPageObject {
  page: Page;
  activate: () => Promise<void>;
  activateViaKeyboard: () => Promise<void>;
  deactivate: () => Promise<void>;
  holdToActivate: (durationMs?: number) => Promise<void>;
  isOverlayVisible: () => Promise<boolean>;
  getOverlayHost: () => Locator;
  getShadowRoot: () => Promise<Element | null>;
  hoverElement: (selector: string) => Promise<void>;
  clickElement: (selector: string) => Promise<void>;
  doubleClickElement: (selector: string) => Promise<void>;
  rightClickElement: (selector: string) => Promise<void>;
  rightClickAtPosition: (x: number, y: number) => Promise<void>;
  dragSelect: (startSelector: string, endSelector: string) => Promise<void>;
  getClipboardContent: () => Promise<string>;
  waitForSelectionBox: () => Promise<void>;
  isContextMenuVisible: () => Promise<boolean>;
  getContextMenuInfo: () => Promise<ContextMenuInfo>;
  isContextMenuItemEnabled: (label: string) => Promise<boolean>;
  clickContextMenuItem: (label: string) => Promise<void>;
  isSelectionBoxVisible: () => Promise<boolean>;
  pressEscape: () => Promise<void>;
  pressArrowDown: () => Promise<void>;
  pressArrowUp: () => Promise<void>;
  pressArrowLeft: () => Promise<void>;
  pressArrowRight: () => Promise<void>;
  scrollPage: (deltaY: number) => Promise<void>;
}

const createReactGrabPageObject = (page: Page): ReactGrabPageObject => {
  const getOverlayHost = () => page.locator(`[${ATTRIBUTE_NAME}]`).first();

  const getShadowRoot = async () => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      return host?.shadowRoot?.querySelector(`[${attrName}]`) ?? null;
    }, ATTRIBUTE_NAME);
  };

  const isOverlayVisible = async () => {
    const isActive = await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { isActive: () => boolean } })
        .__REACT_GRAB__;
      return api?.isActive() ?? false;
    });
    return isActive;
  };

  const holdToActivate = async (durationMs = DEFAULT_KEY_HOLD_DURATION_MS) => {
    await page.click("body");
    await page.keyboard.down("Meta");
    await page.keyboard.down("c");
    await page.waitForTimeout(durationMs + ACTIVATION_BUFFER_MS);
  };

  const activate = async () => {
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { activate: () => void } })
        .__REACT_GRAB__;
      api?.activate();
    });
    await page.waitForTimeout(100);
  };

  const activateViaKeyboard = async () => {
    await holdToActivate();
    await page.keyboard.up("c");
    await page.keyboard.up("Meta");
    await page.waitForTimeout(100);
  };

  const deactivate = async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
  };

  const hoverElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.hover();
    await page.waitForTimeout(50);
  };

  const clickElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.click({ force: true });
  };

  const dragSelect = async (startSelector: string, endSelector: string) => {
    const startElement = page.locator(startSelector).first();
    const endElement = page.locator(endSelector).last();

    const startBox = await startElement.boundingBox();
    const endBox = await endElement.boundingBox();

    if (!startBox || !endBox) {
      throw new Error("Could not get bounding boxes for drag selection");
    }

    const startX = startBox.x - 10;
    const startY = startBox.y - 10;
    const endX = endBox.x + endBox.width + 10;
    const endY = endBox.y + endBox.height + 10;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();
  };

  const getClipboardContent = async () => {
    return page.evaluate(() => navigator.clipboard.readText());
  };

  const waitForSelectionBox = async () => {
    await page.waitForTimeout(100);
  };

  const pressEscape = async () => {
    await page.keyboard.press("Escape");
  };

  const pressArrowDown = async () => {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(50);
  };

  const pressArrowUp = async () => {
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(50);
  };

  const pressArrowLeft = async () => {
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(50);
  };

  const pressArrowRight = async () => {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(50);
  };

  const doubleClickElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.dblclick({ force: true });
  };

  const rightClickElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.click({ button: "right", force: true });
    await page.waitForTimeout(100);
  };

  const rightClickAtPosition = async (x: number, y: number) => {
    await page.mouse.click(x, y, { button: "right" });
    await page.waitForTimeout(100);
  };

  const isContextMenuVisible = async () => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const buttons = Array.from(root.querySelectorAll("button[data-react-grab-ignore-events]"));
      for (const button of buttons) {
        const text = (button as HTMLElement).textContent?.trim();
        if (text === "Copy" || text === "Open" || text === "Prompt") {
          return true;
        }
      }
      return false;
    }, ATTRIBUTE_NAME);
  };

  const clickContextMenuItem = async (label: string) => {
    await page.evaluate(
      ({ attrName, itemLabel }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) throw new Error("No shadow root found");
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) throw new Error("No inner root found");
        const buttons = Array.from(root.querySelectorAll("button[data-react-grab-ignore-events]"));
        for (const button of buttons) {
          if ((button as HTMLElement).textContent?.trim() === itemLabel) {
            (button as HTMLButtonElement).click();
            return;
          }
        }
        throw new Error(`Context menu item "${itemLabel}" not found`);
      },
      { attrName: ATTRIBUTE_NAME, itemLabel: label },
    );
    await page.waitForTimeout(100);
  };

  const getContextMenuInfo = async (): Promise<ContextMenuInfo> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return { isVisible: false, tagBadgeText: null, menuItems: [], position: null };

      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return { isVisible: false, tagBadgeText: null, menuItems: [], position: null };

      const contextMenuContainer = root.querySelector<HTMLElement>("[data-react-grab-ignore-events]");
      if (!contextMenuContainer) return { isVisible: false, tagBadgeText: null, menuItems: [], position: null };

      const buttons = Array.from(contextMenuContainer.querySelectorAll("button[data-react-grab-ignore-events]"));
      const menuItems: string[] = [];
      let hasContextMenuItems = false;

      for (const button of buttons) {
        const text = (button as HTMLElement).textContent?.trim();
        if (text === "Copy" || text === "Open" || text === "Prompt") {
          hasContextMenuItems = true;
          menuItems.push(text);
        }
      }

      if (!hasContextMenuItems) return { isVisible: false, tagBadgeText: null, menuItems: [], position: null };

      const tagBadgeElement = contextMenuContainer.querySelector("span");
      const tagBadgeText = tagBadgeElement?.textContent?.trim() ?? null;

      const style = contextMenuContainer.style;
      const position = style.left && style.top
        ? { x: parseFloat(style.left), y: parseFloat(style.top) }
        : null;

      return { isVisible: true, tagBadgeText, menuItems, position };
    }, ATTRIBUTE_NAME);
  };

  const isContextMenuItemEnabled = async (label: string): Promise<boolean> => {
    return page.evaluate(
      ({ attrName, itemLabel }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        const buttons = Array.from(root.querySelectorAll("button[data-react-grab-ignore-events]"));
        for (const button of buttons) {
          if ((button as HTMLElement).textContent?.trim() === itemLabel) {
            return !(button as HTMLButtonElement).disabled;
          }
        }
        return false;
      },
      { attrName: ATTRIBUTE_NAME, itemLabel: label },
    );
  };

  const isSelectionBoxVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const svgElements = root.querySelectorAll("svg");
      return svgElements.length > 0;
    }, ATTRIBUTE_NAME);
  };

  const scrollPage = async (deltaY: number) => {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(100);
  };

  return {
    page,
    activate,
    activateViaKeyboard,
    deactivate,
    holdToActivate,
    isOverlayVisible,
    getOverlayHost,
    getShadowRoot,
    hoverElement,
    clickElement,
    doubleClickElement,
    rightClickElement,
    rightClickAtPosition,
    dragSelect,
    getClipboardContent,
    waitForSelectionBox,
    isContextMenuVisible,
    getContextMenuInfo,
    isContextMenuItemEnabled,
    clickContextMenuItem,
    isSelectionBoxVisible,
    pressEscape,
    pressArrowDown,
    pressArrowUp,
    pressArrowLeft,
    pressArrowRight,
    scrollPage,
  };
};

export const test = base.extend<{ reactGrab: ReactGrabPageObject }>({
  reactGrab: async ({ page }, use) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const reactGrab = createReactGrabPageObject(page);
    await use(reactGrab);
  },
});

export { expect };
