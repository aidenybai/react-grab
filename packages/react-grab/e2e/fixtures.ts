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

interface SelectionLabelInfo {
  isVisible: boolean;
  tagName: string | null;
  componentName: string | null;
  status: string | null;
  elementsCount: number | null;
  filePath: string | null;
}

interface ToolbarInfo {
  isVisible: boolean;
  isCollapsed: boolean;
  position: { x: number; y: number } | null;
  snapEdge: string | null;
}

interface AgentSessionInfo {
  id: string;
  status: string;
  isStreaming: boolean;
  error: string | null;
  prompt: string;
}

interface ReactGrabState {
  isActive: boolean;
  isDragging: boolean;
  isCopying: boolean;
  isPromptMode: boolean;
  targetElement: boolean;
  dragBounds: { x: number; y: number; width: number; height: number } | null;
}

interface CrosshairInfo {
  isVisible: boolean;
  position: { x: number; y: number } | null;
}

interface GrabbedBoxInfo {
  count: number;
  boxes: Array<{
    id: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
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
  pressEnter: () => Promise<void>;
  pressKey: (key: string) => Promise<void>;
  pressKeyCombo: (modifiers: string[], key: string) => Promise<void>;
  scrollPage: (deltaY: number) => Promise<void>;

  enterPromptMode: (selector: string) => Promise<void>;
  isPromptModeActive: () => Promise<boolean>;
  typeInInput: (text: string) => Promise<void>;
  getInputValue: () => Promise<string>;
  submitInput: () => Promise<void>;
  clearInput: () => Promise<void>;
  isPendingDismissVisible: () => Promise<boolean>;

  isToolbarVisible: () => Promise<boolean>;
  isToolbarCollapsed: () => Promise<boolean>;
  getToolbarInfo: () => Promise<ToolbarInfo>;
  clickToolbarToggle: () => Promise<void>;
  clickToolbarCollapse: () => Promise<void>;
  dragToolbar: (deltaX: number, deltaY: number) => Promise<void>;

  getSelectionLabelInfo: () => Promise<SelectionLabelInfo>;
  isSelectionLabelVisible: () => Promise<boolean>;
  getLabelStatusText: () => Promise<string | null>;

  getCrosshairInfo: () => Promise<CrosshairInfo>;
  isCrosshairVisible: () => Promise<boolean>;
  getGrabbedBoxInfo: () => Promise<GrabbedBoxInfo>;
  isGrabbedBoxVisible: () => Promise<boolean>;
  getDragBoxBounds: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
  getSelectionBoxBounds: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;

  getState: () => Promise<ReactGrabState>;
  toggle: () => Promise<void>;
  dispose: () => Promise<void>;
  copyElementViaApi: (selector: string) => Promise<boolean>;
  setAgent: (options: Record<string, unknown>) => Promise<void>;
  updateOptions: (options: Record<string, unknown>) => Promise<void>;
  reinitialize: (options?: Record<string, unknown>) => Promise<void>;

  setupMockAgent: (options?: {
    delay?: number;
    error?: string;
    statusUpdates?: string[];
  }) => Promise<void>;
  getAgentSessions: () => Promise<AgentSessionInfo[]>;
  isAgentSessionVisible: () => Promise<boolean>;
  waitForAgentSession: (timeout?: number) => Promise<void>;
  waitForAgentComplete: (timeout?: number) => Promise<void>;
  clickAgentDismiss: () => Promise<void>;
  clickAgentUndo: () => Promise<void>;
  clickAgentRetry: () => Promise<void>;
  clickAgentAbort: () => Promise<void>;
  confirmAgentAbort: () => Promise<void>;
  cancelAgentAbort: () => Promise<void>;

  touchStart: (x: number, y: number) => Promise<void>;
  touchMove: (x: number, y: number) => Promise<void>;
  touchEnd: (x: number, y: number) => Promise<void>;
  touchTap: (selector: string) => Promise<void>;
  touchDrag: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) => Promise<void>;
  isTouchMode: () => Promise<boolean>;

  setViewportSize: (width: number, height: number) => Promise<void>;
  getViewportSize: () => Promise<{ width: number; height: number }>;

  removeElement: (selector: string) => Promise<void>;
  hideElement: (selector: string) => Promise<void>;
  showElement: (selector: string) => Promise<void>;
  getElementBounds: (
    selector: string,
  ) => Promise<{ x: number; y: number; width: number; height: number } | null>;

  setupCallbackTracking: () => Promise<void>;
  getCallbackHistory: () => Promise<
    Array<{ name: string; args: unknown[]; timestamp: number }>
  >;
  clearCallbackHistory: () => Promise<void>;
  waitForCallback: (name: string, timeout?: number) => Promise<unknown[]>;
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
    return page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { isActive: () => boolean } })
        .__REACT_GRAB__;
      return api?.isActive() ?? false;
    });
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

  const pressEnter = async () => {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
  };

  const pressKey = async (key: string) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(50);
  };

  const pressKeyCombo = async (modifiers: string[], key: string) => {
    for (const modifier of modifiers) {
      await page.keyboard.down(modifier);
    }
    await page.keyboard.press(key);
    for (const modifier of [...modifiers].reverse()) {
      await page.keyboard.up(modifier);
    }
    await page.waitForTimeout(50);
  };

  const rightClickElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.click({ button: "right", force: true });
    await page.waitForTimeout(200);
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
      const menuItem = root.querySelector("[data-react-grab-menu-item]");
      return menuItem !== null;
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
        const button = root.querySelector<HTMLButtonElement>(
          `[data-react-grab-menu-item="${itemLabel.toLowerCase()}"]`,
        );
        if (!button)
          throw new Error(`Context menu item "${itemLabel}" not found`);
        button.click();
      },
      { attrName: ATTRIBUTE_NAME, itemLabel: label },
    );
    await page.waitForTimeout(100);
  };

  const getContextMenuInfo = async (): Promise<ContextMenuInfo> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot)
        return {
          isVisible: false,
          tagBadgeText: null,
          menuItems: [],
          position: null,
        };

      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root)
        return {
          isVisible: false,
          tagBadgeText: null,
          menuItems: [],
          position: null,
        };

      const contextMenu = root.querySelector<HTMLElement>(
        "[data-react-grab-context-menu]",
      );
      if (!contextMenu)
        return {
          isVisible: false,
          tagBadgeText: null,
          menuItems: [],
          position: null,
        };

      const menuItemButtons = Array.from(
        contextMenu.querySelectorAll<HTMLButtonElement>(
          "[data-react-grab-menu-item]",
        ),
      );
      const menuItems = menuItemButtons.map((btn) => {
        const item = btn.dataset.reactGrabMenuItem ?? "";
        return item.charAt(0).toUpperCase() + item.slice(1);
      });

      const tagBadgeElement = contextMenu.querySelector("span");
      const tagBadgeText = tagBadgeElement?.textContent?.trim() ?? null;

      const style = contextMenu.style;
      const position =
        style.left && style.top
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
        const button = root.querySelector<HTMLButtonElement>(
          `[data-react-grab-menu-item="${itemLabel.toLowerCase()}"]`,
        );
        return button ? !button.disabled : false;
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
      const canvas = root.querySelector("[data-react-grab-overlay-canvas]");
      if (!canvas) return false;
      const api = (window as { __REACT_GRAB__?: { getState: () => { targetElement: Element | null } } }).__REACT_GRAB__;
      return api?.getState()?.targetElement !== null;
    }, ATTRIBUTE_NAME);
  };

  const scrollPage = async (deltaY: number) => {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(100);
  };

  const enterPromptMode = async (selector: string) => {
    await activate();
    await hoverElement(selector);
    await waitForSelectionBox();
    await rightClickElement(selector);
    await page.waitForTimeout(100);
    await clickContextMenuItem("Edit");
    await page.waitForTimeout(100);
  };

  const isPromptModeActive = async (): Promise<boolean> => {
    return page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: { getState: () => { isPromptMode: boolean } };
        }
      ).__REACT_GRAB__;
      return api?.getState()?.isPromptMode ?? false;
    });
  };

  const typeInInput = async (text: string) => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const textarea = root.querySelector<HTMLTextAreaElement>(
        "[data-react-grab-input]",
      );
      if (textarea) {
        textarea.focus();
      }
    }, ATTRIBUTE_NAME);
    await page.keyboard.type(text);
    await page.waitForTimeout(50);
  };

  const getInputValue = async (): Promise<string> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return "";
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return "";
      const textarea = root.querySelector(
        "textarea[data-react-grab-ignore-events]",
      ) as HTMLTextAreaElement;
      return textarea?.value ?? "";
    }, ATTRIBUTE_NAME);
  };

  const submitInput = async () => {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
  };

  const clearInput = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const textarea = root.querySelector(
        "textarea[data-react-grab-ignore-events]",
      ) as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = "";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, ATTRIBUTE_NAME);
  };

  const isPendingDismissVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const discardPrompt = root.querySelector(
        "[data-react-grab-discard-prompt]",
      );
      return discardPrompt !== null;
    }, ATTRIBUTE_NAME);
  };

  const isToolbarVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const toolbar = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar]",
      );
      if (!toolbar) return false;
      const computedStyle = window.getComputedStyle(toolbar);
      return computedStyle.opacity !== "0";
    }, ATTRIBUTE_NAME);
  };

  const isToolbarCollapsed = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const toolbar = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar]",
      );
      if (!toolbar) return false;
      const computedStyle = window.getComputedStyle(toolbar);
      return computedStyle.cursor === "pointer";
    }, ATTRIBUTE_NAME);
  };

  const getToolbarInfo = async (): Promise<ToolbarInfo> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot)
        return {
          isVisible: false,
          isCollapsed: false,
          position: null,
          snapEdge: null,
        };
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root)
        return {
          isVisible: false,
          isCollapsed: false,
          position: null,
          snapEdge: null,
        };

      const toolbar = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar]",
      );
      if (!toolbar)
        return {
          isVisible: false,
          isCollapsed: false,
          position: null,
          snapEdge: null,
        };

      const computedStyle = window.getComputedStyle(toolbar);
      const transform = toolbar.style.transform;
      const translateMatch = transform.match(
        /translate\(([^,]+)px,\s*([^)]+)px\)/,
      );
      const position = translateMatch
        ? { x: parseFloat(translateMatch[1]), y: parseFloat(translateMatch[2]) }
        : null;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = toolbar.getBoundingClientRect();

      let snapEdge: string | null = null;
      if (position) {
        const SNAP_THRESHOLD = 30;
        if (position.y <= SNAP_THRESHOLD) snapEdge = "top";
        else if (position.y + rect.height >= viewportHeight - SNAP_THRESHOLD)
          snapEdge = "bottom";
        else if (position.x <= SNAP_THRESHOLD) snapEdge = "left";
        else if (position.x + rect.width >= viewportWidth - SNAP_THRESHOLD)
          snapEdge = "right";
      }

      const isCollapsed = computedStyle.cursor === "pointer";

      return {
        isVisible: computedStyle.opacity !== "0",
        isCollapsed,
        position,
        snapEdge,
      };
    }, ATTRIBUTE_NAME);
  };

  const clickToolbarToggle = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const toggleButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-toolbar-toggle]",
      );
      toggleButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const clickToolbarCollapse = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const collapseButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-toolbar-collapse]",
      );
      collapseButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const dragToolbar = async (deltaX: number, deltaY: number) => {
    const toolbarInfo = await getToolbarInfo();
    if (!toolbarInfo.position) return;

    const startX = toolbarInfo.position.x + 20;
    const startY = toolbarInfo.position.y + 10;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  const getSelectionLabelInfo = async (): Promise<SelectionLabelInfo> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot)
        return {
          isVisible: false,
          tagName: null,
          componentName: null,
          status: null,
          elementsCount: null,
          filePath: null,
        };
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root)
        return {
          isVisible: false,
          tagName: null,
          componentName: null,
          status: null,
          elementsCount: null,
          filePath: null,
        };

      const label = root.querySelector("[data-react-grab-selection-label]");
      if (!label)
        return {
          isVisible: false,
          tagName: null,
          componentName: null,
          status: null,
          elementsCount: null,
          filePath: null,
        };

      let tagName: string | null = null;
      let componentName: string | null = null;
      let elementsCount: number | null = null;

      const allSpans = Array.from(label.querySelectorAll("span"));
      for (const span of allSpans) {
        const spanText = span.textContent?.trim() ?? "";
        if (spanText.includes("elements")) {
          const match = spanText.match(/(\d+)\s*elements/);
          elementsCount = match ? parseInt(match[1], 10) : null;
        } else if (spanText.includes(".")) {
          const parts = spanText.split(".");
          componentName = parts[0] ?? null;
          tagName = parts[1] ?? null;
        } else if (spanText && !spanText.includes("Editing") && !tagName) {
          tagName = spanText;
        }
      }

      const statusElement = label.querySelector(".animate-pulse");
      const status = statusElement ? "copying" : "idle";

      return {
        isVisible: true,
        tagName,
        componentName,
        status,
        elementsCount,
        filePath: null,
      };
    }, ATTRIBUTE_NAME);
  };

  const isSelectionLabelVisible = async (): Promise<boolean> => {
    const info = await getSelectionLabelInfo();
    return info.isVisible;
  };

  const getLabelStatusText = async (): Promise<string | null> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return null;

      const pulsingElements = Array.from(
        root.querySelectorAll(".animate-pulse"),
      );
      for (let i = 0; i < pulsingElements.length; i++) {
        const element = pulsingElements[i];
        const text = element.textContent?.trim();
        if (text) return text;
      }

      const completedTexts = ["Copied", "Completed", "Done"];
      for (let i = 0; i < completedTexts.length; i++) {
        const text = completedTexts[i];
        if (root.textContent?.includes(text)) return text;
      }

      return null;
    }, ATTRIBUTE_NAME);
  };

  const getCrosshairInfo = async (): Promise<CrosshairInfo> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return { isVisible: false, position: null };
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return { isVisible: false, position: null };

      const crosshairElements = Array.from(
        root.querySelectorAll("div[style*='pointer-events: none']"),
      );
      for (let i = 0; i < crosshairElements.length; i++) {
        const element = crosshairElements[i] as HTMLElement;
        const style = element.style;
        if (
          style.position === "fixed" &&
          (style.width === "1px" ||
            style.height === "1px" ||
            style.width === "100%" ||
            style.height === "100%")
        ) {
          const transform = style.transform;
          const match = transform?.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
          if (match) {
            return {
              isVisible: true,
              position: { x: parseFloat(match[1]), y: parseFloat(match[2]) },
            };
          }
        }
      }
      return { isVisible: false, position: null };
    }, ATTRIBUTE_NAME);
  };

  const isCrosshairVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const canvas = root.querySelector("[data-react-grab-overlay-canvas]");
      if (!canvas) return false;

      const api = (window as {
        __REACT_GRAB__?: {
          isActive: () => boolean;
        };
      }).__REACT_GRAB__;

      return api?.isActive() ?? false;
    }, ATTRIBUTE_NAME);
  };

  const getGrabbedBoxInfo = async (): Promise<GrabbedBoxInfo> => {
    return page.evaluate(() => {
      const api = (window as {
        __REACT_GRAB__?: {
          getState: () => {
            grabbedBoxes: Array<{
              id: string;
              bounds: { x: number; y: number; width: number; height: number };
              createdAt: number;
            }>;
          };
        };
      }).__REACT_GRAB__;

      const state = api?.getState();
      const grabbedBoxes = state?.grabbedBoxes ?? [];

      return {
        count: grabbedBoxes.length,
        boxes: grabbedBoxes.map((box) => ({
          id: box.id,
          bounds: box.bounds,
        })),
      };
    });
  };

  const isGrabbedBoxVisible = async (): Promise<boolean> => {
    return page.evaluate(() => {
      const api = (window as {
        __REACT_GRAB__?: {
          getState: () => {
            grabbedBoxes: Array<{ id: string }>;
          };
        };
      }).__REACT_GRAB__;

      const state = api?.getState();
      return (state?.grabbedBoxes?.length ?? 0) > 0;
    });
  };

  const getDragBoxBounds = async (): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> => {
    return page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { getState: () => { isDragging: boolean; dragBounds: { x: number; y: number; width: number; height: number } | null } } }).__REACT_GRAB__;
      const state = api?.getState();
      if (!state?.isDragging || !state?.dragBounds) return null;
      return state.dragBounds;
    });
  };

  const getSelectionBoxBounds = async (): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> => {
    return page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { getState: () => { targetElement: Element | null } } }).__REACT_GRAB__;
      const state = api?.getState();
      if (!state?.targetElement) return null;
      const rect = state.targetElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }
      return null;
    });
  };

  const getState = async (): Promise<ReactGrabState> => {
    return page.evaluate(() => {
      const api = (
        window as { __REACT_GRAB__?: { getState: () => ReactGrabState } }
      ).__REACT_GRAB__;
      const state = api?.getState();
      return (
        state ?? {
          isActive: false,
          isDragging: false,
          isCopying: false,
          isPromptMode: false,
          targetElement: false,
          dragBounds: null,
        }
      );
    });
  };

  const toggle = async () => {
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { toggle: () => void } })
        .__REACT_GRAB__;
      api?.toggle();
    });
    await page.waitForTimeout(100);
  };

  const dispose = async () => {
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { dispose: () => void } })
        .__REACT_GRAB__;
      api?.dispose();
    });
    await page.waitForTimeout(100);
  };

  const copyElementViaApi = async (selector: string): Promise<boolean> => {
    return page.evaluate(async (sel) => {
      const api = (
        window as {
          __REACT_GRAB__?: { copyElement: (el: Element) => Promise<boolean> };
        }
      ).__REACT_GRAB__;
      const element = document.querySelector(sel);
      if (!element || !api) return false;
      return api.copyElement(element);
    }, selector);
  };

  const setAgent = async (options: Record<string, unknown>) => {
    await page.evaluate((opts) => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: { name: string; agent: Record<string, unknown> }) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("test-agent");
      api?.registerPlugin({ name: "test-agent", agent: opts });
    }, options);
    await page.waitForTimeout(100);
  };

  const updateOptions = async (options: Record<string, unknown>) => {
    await page.evaluate((opts) => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            setOptions: (o: Record<string, unknown>) => void;
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: Record<string, unknown>) => void;
          };
        }
      ).__REACT_GRAB__;

      const pluginKeys = ["theme", "agent", "contextMenuActions"];
      const hookKeys = [
        "onActivate", "onDeactivate", "onElementHover", "onElementSelect",
        "onDragStart", "onDragEnd", "onBeforeCopy", "onAfterCopy",
        "onCopySuccess", "onCopyError", "onStateChange", "onPromptModeChange",
        "onSelectionBox", "onDragBox", "onCrosshair", "onGrabbedBox",
        "onContextMenu", "onOpenFile", "onElementLabel",
      ];

      const pluginOpts: Record<string, unknown> = {};
      const hooks: Record<string, unknown> = {};
      const regularOpts: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(opts)) {
        if (pluginKeys.includes(key)) {
          pluginOpts[key] = value;
        } else if (hookKeys.includes(key)) {
          hooks[key] = value;
        } else {
          regularOpts[key] = value;
        }
      }

      if (Object.keys(regularOpts).length > 0) {
        api?.setOptions(regularOpts);
      }

      if (Object.keys(pluginOpts).length > 0 || Object.keys(hooks).length > 0) {
        api?.unregisterPlugin("test-options");
        api?.registerPlugin({
          name: "test-options",
          ...pluginOpts,
          ...(Object.keys(hooks).length > 0 ? { hooks } : {}),
        });
      }
    }, options);
    await page.waitForTimeout(100);
  };

  const reinitialize = async (options?: Record<string, unknown>) => {
    await page.evaluate((opts) => {
      const existingApi = (
        window as { __REACT_GRAB__?: { dispose: () => void } }
      ).__REACT_GRAB__;
      existingApi?.dispose();

      const initFn = (
        window as { initReactGrab?: (o?: Record<string, unknown>) => void }
      ).initReactGrab;
      initFn?.(opts);
    }, options);
    await page.waitForTimeout(200);
  };

  const setupMockAgent = async (options?: {
    delay?: number;
    error?: string;
    statusUpdates?: string[];
  }) => {
    await page.evaluate((opts) => {
      const delay = opts?.delay ?? 500;
      const error = opts?.error;
      const statusUpdates = opts?.statusUpdates ?? [
        "Processing...",
        "Almost done...",
      ];

      const mockProvider = {
        async *send() {
          for (let i = 0; i < statusUpdates.length; i++) {
            yield statusUpdates[i];
            await new Promise((resolve) =>
              setTimeout(resolve, delay / statusUpdates.length),
            );
          }
          if (error) {
            throw new Error(error);
          }
          yield "Completed";
        },
        supportsFollowUp: true,
        undo: async () => {},
        canUndo: () => true,
        redo: async () => {},
        canRedo: () => true,
      };

      const api = (
        window as {
          __REACT_GRAB__?: {
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: { name: string; agent: Record<string, unknown> }) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("mock-agent");
      api?.registerPlugin({ name: "mock-agent", agent: { provider: mockProvider } });
    }, options);
    await page.waitForTimeout(100);
  };

  const getAgentSessions = async (): Promise<AgentSessionInfo[]> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return [];
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return [];

      const sessions: AgentSessionInfo[] = [];
      const sessionElements = root.querySelectorAll(
        "[data-react-grab-ignore-events]",
      );

      sessionElements.forEach((element) => {
        const textContent = element.textContent ?? "";
        if (
          textContent.includes("Processing") ||
          textContent.includes("Completed") ||
          textContent.includes("Error")
        ) {
          const statusMatch = textContent.match(
            /(Processing|Completed|Error|Grabbing)/,
          );
          sessions.push({
            id: `session-${sessions.length}`,
            status: statusMatch?.[1] ?? "unknown",
            isStreaming:
              textContent.includes("Processing") ||
              textContent.includes("Grabbing"),
            error: textContent.includes("Error") ? textContent : null,
            prompt: "",
          });
        }
      });

      return sessions;
    }, ATTRIBUTE_NAME);
  };

  const isAgentSessionVisible = async (): Promise<boolean> => {
    const sessions = await getAgentSessions();
    return sessions.length > 0;
  };

  const waitForAgentSession = async (timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const isVisible = await isAgentSessionVisible();
      if (isVisible) return;
      await page.waitForTimeout(100);
    }
    throw new Error("Agent session did not appear within timeout");
  };

  const waitForAgentComplete = async (timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const sessions = await getAgentSessions();
      const hasStreamingSession = sessions.some((s) => s.isStreaming);
      if (!hasStreamingSession && sessions.length > 0) return;
      await page.waitForTimeout(100);
    }
    throw new Error("Agent session did not complete within timeout");
  };

  const clickAgentDismiss = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;

      const dismissButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-dismiss]",
      );
      dismissButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const clickAgentUndo = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;

      const undoButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-undo]",
      );
      undoButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const clickAgentRetry = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;

      const retryButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-retry]",
      );
      retryButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const clickAgentAbort = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;

      const abortButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-abort]",
      );
      abortButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const confirmAgentAbort = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;

      const yesButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-discard-yes]",
      );
      yesButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const cancelAgentAbort = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;

      const noButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-discard-no]",
      );
      noButton?.click();
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(100);
  };

  const dispatchTouchEvent = async (
    type: "touchstart" | "touchmove" | "touchend",
    x: number,
    y: number,
    identifier = 0,
  ) => {
    await page.evaluate(
      ({ type, x, y, identifier }) => {
        const target = document.elementFromPoint(x, y) || document.body;
        const touch = new Touch({
          identifier,
          target,
          clientX: x,
          clientY: y,
          pageX: x + window.scrollX,
          pageY: y + window.scrollY,
          screenX: x,
          screenY: y,
        });
        const touches = type === "touchend" ? [] : [touch];
        const touchEvent = new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches,
          targetTouches: touches,
          changedTouches: [touch],
        });
        target.dispatchEvent(touchEvent);
      },
      { type, x, y, identifier },
    );
  };

  const touchStart = async (x: number, y: number) => {
    await dispatchTouchEvent("touchstart", x, y);
  };

  const touchMove = async (x: number, y: number) => {
    await dispatchTouchEvent("touchmove", x, y);
  };

  const touchEnd = async (x: number, y: number) => {
    await dispatchTouchEvent("touchend", x, y);
  };

  const touchTap = async (selector: string) => {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
  };

  const touchDrag = async (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) => {
    await dispatchTouchEvent("touchstart", startX, startY);
    await page.waitForTimeout(50);

    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const currentX = startX + ((endX - startX) * i) / steps;
      const currentY = startY + ((endY - startY) * i) / steps;
      await dispatchTouchEvent("touchmove", currentX, currentY);
      await page.waitForTimeout(10);
    }

    await dispatchTouchEvent("touchend", endX, endY);
    await page.waitForTimeout(50);
  };

  const isTouchMode = async (): Promise<boolean> => {
    return page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: { getState: () => { isTouchMode?: boolean } };
        }
      ).__REACT_GRAB__;
      return (
        (api?.getState() as { isTouchMode?: boolean })?.isTouchMode ?? false
      );
    });
  };

  const setViewportSize = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
  };

  const getViewportSize = async (): Promise<{
    width: number;
    height: number;
  }> => {
    return page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
  };

  const removeElement = async (selector: string) => {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      element?.remove();
    }, selector);
    await page.waitForTimeout(50);
  };

  const hideElement = async (selector: string) => {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) element.style.display = "none";
    }, selector);
    await page.waitForTimeout(50);
  };

  const showElement = async (selector: string) => {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) element.style.display = "";
    }, selector);
    await page.waitForTimeout(50);
  };

  const getElementBounds = async (
    selector: string,
  ): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> => {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    return box
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : null;
  };

  const setupCallbackTracking = async () => {
    await page.evaluate(() => {
      (
        window as {
          __CALLBACK_HISTORY__?: Array<{
            name: string;
            args: unknown[];
            timestamp: number;
          }>;
        }
      ).__CALLBACK_HISTORY__ = [];

      const trackCallback =
        (name: string) =>
        (...args: unknown[]) => {
          (
            window as {
              __CALLBACK_HISTORY__?: Array<{
                name: string;
                args: unknown[];
                timestamp: number;
              }>;
            }
          ).__CALLBACK_HISTORY__?.push({ name, args, timestamp: Date.now() });
        };

      const api = (
        window as {
          __REACT_GRAB__?: {
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: { name: string; hooks: Record<string, unknown> }) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("callback-tracking");
      api?.registerPlugin({
        name: "callback-tracking",
        hooks: {
          onActivate: trackCallback("onActivate"),
          onDeactivate: trackCallback("onDeactivate"),
          onElementHover: trackCallback("onElementHover"),
          onElementSelect: trackCallback("onElementSelect"),
          onDragStart: trackCallback("onDragStart"),
          onDragEnd: trackCallback("onDragEnd"),
          onBeforeCopy: trackCallback("onBeforeCopy"),
          onAfterCopy: trackCallback("onAfterCopy"),
          onCopySuccess: trackCallback("onCopySuccess"),
          onCopyError: trackCallback("onCopyError"),
          onStateChange: trackCallback("onStateChange"),
          onPromptModeChange: trackCallback("onPromptModeChange"),
          onSelectionBox: trackCallback("onSelectionBox"),
          onDragBox: trackCallback("onDragBox"),
          onCrosshair: trackCallback("onCrosshair"),
          onGrabbedBox: trackCallback("onGrabbedBox"),
          onContextMenu: trackCallback("onContextMenu"),
          onOpenFile: trackCallback("onOpenFile"),
        },
      });
    });
  };

  const getCallbackHistory = async (): Promise<
    Array<{ name: string; args: unknown[]; timestamp: number }>
  > => {
    return page.evaluate(() => {
      return (
        (
          window as {
            __CALLBACK_HISTORY__?: Array<{
              name: string;
              args: unknown[];
              timestamp: number;
            }>;
          }
        ).__CALLBACK_HISTORY__ ?? []
      );
    });
  };

  const clearCallbackHistory = async () => {
    await page.evaluate(() => {
      (
        window as {
          __CALLBACK_HISTORY__?: Array<{
            name: string;
            args: unknown[];
            timestamp: number;
          }>;
        }
      ).__CALLBACK_HISTORY__ = [];
    });
  };

  const waitForCallback = async (
    name: string,
    timeout = 5000,
  ): Promise<unknown[]> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const history = await getCallbackHistory();
      const callback = history.find((c) => c.name === name);
      if (callback) return callback.args;
      await page.waitForTimeout(50);
    }
    throw new Error(`Callback "${name}" was not called within timeout`);
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
    pressEnter,
    pressKey,
    pressKeyCombo,
    scrollPage,

    enterPromptMode,
    isPromptModeActive,
    typeInInput,
    getInputValue,
    submitInput,
    clearInput,
    isPendingDismissVisible,

    isToolbarVisible,
    isToolbarCollapsed,
    getToolbarInfo,
    clickToolbarToggle,
    clickToolbarCollapse,
    dragToolbar,

    getSelectionLabelInfo,
    isSelectionLabelVisible,
    getLabelStatusText,

    getCrosshairInfo,
    isCrosshairVisible,
    getGrabbedBoxInfo,
    isGrabbedBoxVisible,
    getDragBoxBounds,
    getSelectionBoxBounds,

    getState,
    toggle,
    dispose,
    copyElementViaApi,
    setAgent,
    updateOptions,
    reinitialize,

    setupMockAgent,
    getAgentSessions,
    isAgentSessionVisible,
    waitForAgentSession,
    waitForAgentComplete,
    clickAgentDismiss,
    clickAgentUndo,
    clickAgentRetry,
    clickAgentAbort,
    confirmAgentAbort,
    cancelAgentAbort,

    touchStart,
    touchMove,
    touchEnd,
    touchTap,
    touchDrag,
    isTouchMode,

    setViewportSize,
    getViewportSize,

    removeElement,
    hideElement,
    showElement,
    getElementBounds,

    setupCallbackTracking,
    getCallbackHistory,
    clearCallbackHistory,
    waitForCallback,
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
