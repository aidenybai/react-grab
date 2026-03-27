import { test as base, expect, Page, Locator } from "@playwright/test";

const ATTRIBUTE_NAME = "data-react-grab";
const DEFAULT_KEY_HOLD_DURATION_MS = 200;
const ACTIVATION_BUFFER_MS = 200;
const PAGE_SETUP_MAX_ATTEMPTS = 2;
const PAGE_SETUP_NAVIGATION_TIMEOUT_MS = 8_000;
const PAGE_SETUP_API_TIMEOUT_MS = 8_000;
const MODIFIER_KEY = process.platform === "darwin" ? "Meta" : "Control";

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

interface SelectionLabelBounds {
  label: { x: number; y: number; width: number; height: number };
  arrow: { x: number; y: number; width: number; height: number } | null;
  viewport: { width: number; height: number };
}

interface ToolbarInfo {
  isVisible: boolean;
  isCollapsed: boolean;
  isVertical: boolean;
  position: { x: number; y: number } | null;
  dimensions: { width: number; height: number } | null;
  snapEdge: string | null;
}

interface AgentSessionInfo {
  id: string;
  status: string;
  isStreaming: boolean;
  error: string | null;
  prompt: string;
}

interface LabelInstanceInfo {
  id: string;
  status: string;
  tagName: string;
  componentName?: string;
  createdAt: number;
}

interface ReactGrabState {
  isActive: boolean;
  isDragging: boolean;
  isCopying: boolean;
  isPromptMode: boolean;
  targetElement: boolean;
  dragBounds: { x: number; y: number; width: number; height: number } | null;
  grabbedBoxes: Array<{
    id: string;
    bounds: { x: number; y: number; width: number; height: number };
    createdAt: number;
  }>;
  labelInstances: LabelInstanceInfo[];
}

interface GrabbedBoxInfo {
  count: number;
  boxes: Array<{
    id: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

interface CommentsDropdownInfo {
  isVisible: boolean;
  itemCount: number;
}

export interface ReactGrabPageObject {
  page: Page;
  modifierKey: "Meta" | "Control";
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
  captureNextClipboardWrites: () => Promise<Record<string, string>>;
  waitForSelectionBox: () => Promise<void>;
  waitForSelectionSource: () => Promise<void>;
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
  pressModifierKeyCombo: (key: string) => Promise<void>;
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
  clickToolbarEnabled: () => Promise<void>;
  dragToolbarFromButton: (
    buttonSelector: string,
    deltaX: number,
    deltaY: number,
  ) => Promise<void>;

  rightClickToolbarToggle: () => Promise<void>;
  isToolbarMenuVisible: () => Promise<boolean>;
  getToolbarMenuItemLabels: () => Promise<string[]>;
  clickToolbarMenuItem: (actionId: string) => Promise<void>;

  isCommentsButtonVisible: () => Promise<boolean>;
  clickCommentsButton: () => Promise<void>;
  isCommentsDropdownVisible: () => Promise<boolean>;
  getCommentsDropdownInfo: () => Promise<CommentsDropdownInfo>;
  clickCommentItem: (index: number) => Promise<void>;
  clickCommentsCopyAll: () => Promise<void>;
  clickCommentsClear: () => Promise<void>;
  hoverCommentItem: (index: number) => Promise<void>;
  hoverCommentsButton: () => Promise<void>;
  hoverCopyAllButton: () => Promise<void>;
  clickToolbarCopyAll: () => Promise<void>;
  isToolbarCopyAllVisible: () => Promise<boolean>;
  isClearCommentsPromptVisible: () => Promise<boolean>;
  confirmClearCommentsPrompt: () => Promise<void>;
  cancelClearCommentsPrompt: () => Promise<void>;
  getCommentsDropdownPosition: () => Promise<{
    left: number;
    top: number;
  } | null>;

  getSelectionLabelInfo: () => Promise<SelectionLabelInfo>;
  getSelectionLabelBounds: () => Promise<SelectionLabelBounds | null>;
  isSelectionLabelVisible: () => Promise<boolean>;
  waitForSelectionLabel: () => Promise<void>;
  getLabelStatusText: () => Promise<string | null>;

  getGrabbedBoxInfo: () => Promise<GrabbedBoxInfo>;
  getLabelInstancesInfo: () => Promise<LabelInstanceInfo[]>;
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
  registerCommentAction: () => Promise<void>;
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
  isDropdownOpen: () => Promise<boolean>;
  openDropdown: () => Promise<void>;

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

  const waitForActive = async (expectedState: boolean) => {
    await page.waitForFunction(
      (expected) => {
        const api = (window as { __REACT_GRAB__?: { isActive: () => boolean } })
          .__REACT_GRAB__;
        return api?.isActive() === expected;
      },
      expectedState,
      { timeout: 5000 },
    );
  };

  const holdToActivate = async (durationMs = DEFAULT_KEY_HOLD_DURATION_MS) => {
    await page.click("body");
    await page.keyboard.down(MODIFIER_KEY);
    await page.keyboard.down("c");
    await page.waitForTimeout(durationMs + ACTIVATION_BUFFER_MS);
  };

  const activate = async () => {
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { activate: () => void } })
        .__REACT_GRAB__;
      api?.activate();
    });
    await waitForActive(true);
  };

  const activateViaKeyboard = async () => {
    await holdToActivate();
    await page.keyboard.up("c");
    await page.keyboard.up(MODIFIER_KEY);
    await waitForActive(true);
  };

  const deactivate = async () => {
    await page.keyboard.press("Escape");
    await waitForActive(false);
  };

  const hoverElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.hover({ force: true });
    await page.waitForTimeout(250);
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
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
  };

  const getClipboardContent = async () => {
    return page.evaluate(() => navigator.clipboard.readText());
  };

  const captureNextClipboardWrites = async () => {
    return page.evaluate(() => {
      return new Promise<Record<string, string>>((resolve) => {
        const clipboardWrites: Record<string, string> = {};
        let didCleanup = false;

        const originalSetData = DataTransfer.prototype.setData;
        DataTransfer.prototype.setData = function (
          type: string,
          value: string,
        ) {
          clipboardWrites[type] = value;
          return originalSetData.call(this, type, value);
        };

        const originalWrite = navigator.clipboard.write.bind(
          navigator.clipboard,
        );
        navigator.clipboard.write = async function (data: ClipboardItem[]) {
          for (const item of data) {
            for (const type of item.types) {
              if (type.startsWith("text/")) {
                const blob = await item.getType(type);
                clipboardWrites[type] = await blob.text();
              }
            }
          }
          try {
            return await originalWrite(data);
          } finally {
            clearTimeout(safetyTimeout);
            queueMicrotask(cleanup);
          }
        };

        const cleanup = () => {
          if (didCleanup) return;
          didCleanup = true;
          DataTransfer.prototype.setData = originalSetData;
          navigator.clipboard.write = originalWrite;
          resolve(clipboardWrites);
        };

        const safetyTimeout = setTimeout(cleanup, 5000);

        document.addEventListener(
          "copy",
          () => {
            clearTimeout(safetyTimeout);
            queueMicrotask(cleanup);
          },
          { once: true, capture: true },
        );
      });
    });
  };

  const waitForSelectionBox = async () => {
    await page.waitForFunction(
      () => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => {
                isSelectionBoxVisible: boolean;
                targetElement: unknown;
              };
            };
          }
        ).__REACT_GRAB__;
        const state = api?.getState();
        return state?.isSelectionBoxVisible || state?.targetElement !== null;
      },
      undefined,
      { timeout: 10_000 },
    );
  };

  const waitForSelectionSource = async () => {
    await page.waitForFunction(
      () => {
        const api = (
          window as {
            __REACT_GRAB__?: {
              getState: () => { selectionFilePath: string | null };
            };
          }
        ).__REACT_GRAB__;
        return api?.getState()?.selectionFilePath !== null;
      },
      undefined,
      { timeout: 5000 },
    );
  };

  const pressEscape = async () => {
    await page.keyboard.press("Escape");
  };

  const pressArrowDown = async () => {
    await page.keyboard.press("ArrowDown");
  };

  const pressArrowUp = async () => {
    await page.keyboard.press("ArrowUp");
  };

  const pressArrowLeft = async () => {
    await page.keyboard.press("ArrowLeft");
  };

  const pressArrowRight = async () => {
    await page.keyboard.press("ArrowRight");
  };

  const pressEnter = async () => {
    await page.keyboard.press("Enter");
  };

  const pressKey = async (key: string) => {
    await page.keyboard.press(key);
  };

  const pressKeyCombo = async (modifiers: string[], key: string) => {
    for (const modifier of modifiers) {
      await page.keyboard.down(modifier);
    }
    await page.keyboard.press(key);
    for (const modifier of [...modifiers].reverse()) {
      await page.keyboard.up(modifier);
    }
  };

  const pressModifierKeyCombo = async (key: string) => {
    await page.keyboard.down(MODIFIER_KEY);
    await page.keyboard.press(key);
    await page.keyboard.up(MODIFIER_KEY);
  };

  const waitForContextMenu = async (visible: boolean) => {
    await page.waitForFunction(
      ({ attrName, expectedVisible }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return !expectedVisible;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return !expectedVisible;
        const menuItem = root.querySelector("[data-react-grab-menu-item]");
        return expectedVisible ? menuItem !== null : menuItem === null;
      },
      { attrName: ATTRIBUTE_NAME, expectedVisible: visible },
      { timeout: 2000 },
    );
  };

  const rightClickElement = async (selector: string) => {
    const element = page.locator(selector).first();
    await element.click({ button: "right", force: true });
    const isActive = await isOverlayVisible();
    if (isActive) {
      await waitForContextMenu(true);
    }
  };

  const rightClickAtPosition = async (x: number, y: number) => {
    await page.mouse.click(x, y, { button: "right" });
    const isActive = await isOverlayVisible();
    if (isActive) {
      await waitForContextMenu(true);
    }
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
    await waitForContextMenu(false);
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
    return page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => { isSelectionBoxVisible: boolean };
          };
        }
      ).__REACT_GRAB__;
      return api?.getState()?.isSelectionBoxVisible ?? false;
    });
  };

  const scrollPage = async (deltaY: number) => {
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, deltaY);
    await page
      .waitForFunction(
        (prevScroll) => window.scrollY !== prevScroll,
        scrollBefore,
        { timeout: 2000 },
      )
      .catch(() => {
        // Scroll may not change if at edge of page, that's okay
      });
  };

  const waitForPromptMode = async (active: boolean) => {
    await page.waitForFunction(
      (expected) => {
        const api = (
          window as {
            __REACT_GRAB__?: { getState: () => { isPromptMode: boolean } };
          }
        ).__REACT_GRAB__;
        return api?.getState()?.isPromptMode === expected;
      },
      active,
      { timeout: 2000 },
    );
  };

  const enterPromptMode = async (selector: string) => {
    await activate();
    await hoverElement(selector);
    const isSelected = await page
      .waitForFunction(
        () => {
          const api = (
            window as {
              __REACT_GRAB__?: {
                getState: () => {
                  isSelectionBoxVisible: boolean;
                  targetElement: unknown;
                };
              };
            }
          ).__REACT_GRAB__;
          const state = api?.getState();
          return state?.isSelectionBoxVisible || state?.targetElement !== null;
        },
        undefined,
        { timeout: 2000 },
      )
      .then(() => true)
      .catch(() => false);
    if (!isSelected) {
      await hoverElement(selector);
      await waitForSelectionBox();
    }
    await rightClickElement(selector);
    await clickContextMenuItem("Edit");
    await waitForPromptMode(true);
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
    await page.keyboard.insertText(text);
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
      return computedStyle.opacity !== "0" && computedStyle.display !== "none";
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
    const defaultInfo: ToolbarInfo = {
      isVisible: false,
      isCollapsed: false,
      isVertical: false,
      position: null,
      dimensions: null,
      snapEdge: null,
    };

    return page.evaluate(
      ({ attrName, fallback }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return fallback;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return fallback;

        const toolbar = root.querySelector<HTMLElement>(
          "[data-react-grab-toolbar]",
        );
        if (!toolbar) return fallback;

        const computedStyle = window.getComputedStyle(toolbar);
        const transform = toolbar.style.transform;
        const translateMatch = transform.match(
          /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
        );
        const position = translateMatch
          ? {
              x: parseFloat(translateMatch[1]),
              y: parseFloat(translateMatch[2]),
            }
          : null;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const rect = toolbar.getBoundingClientRect();
        const dimensions = { width: rect.width, height: rect.height };

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

        const innerDiv = toolbar.querySelector("div");
        const innerStyle = innerDiv ? window.getComputedStyle(innerDiv) : null;
        const isVertical = innerStyle?.flexDirection === "column";

        return {
          isVisible: computedStyle.opacity !== "0",
          isCollapsed,
          isVertical,
          position,
          dimensions,
          snapEdge,
        };
      },
      { attrName: ATTRIBUTE_NAME, fallback: defaultInfo },
    );
  };

  const clickToolbarToggle = async () => {
    const wasActive = await isOverlayVisible();
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
    await waitForActive(!wasActive);
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
  };

  const clickToolbarEnabled = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const enabledButton = root.querySelector<HTMLButtonElement>(
        "[data-react-grab-toolbar-enabled]",
      );
      enabledButton?.click();
    }, ATTRIBUTE_NAME);
  };

  const dragToolbar = async (deltaX: number, deltaY: number) => {
    const toolbarRect = await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return null;
      const toolbar = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar]",
      );
      if (!toolbar) return null;
      const rect = toolbar.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, ATTRIBUTE_NAME);

    if (!toolbarRect) return;

    const startX = toolbarRect.x + toolbarRect.width / 2;
    const startY = toolbarRect.y + toolbarRect.height / 2;
    const endX = startX + deltaX;
    const endY = startY + deltaY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    // HACK: Wait for snap animation to complete
    await page.waitForTimeout(300);
  };

  const dragToolbarFromButton = async (
    buttonSelector: string,
    deltaX: number,
    deltaY: number,
  ) => {
    const buttonRect = await page.evaluate(
      ({ attrName, selector }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return null;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return null;
        const button = root.querySelector<HTMLElement>(selector);
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      },
      { attrName: ATTRIBUTE_NAME, selector: buttonSelector },
    );

    if (!buttonRect) return;

    const startX = buttonRect.x + buttonRect.width / 2;
    const startY = buttonRect.y + buttonRect.height / 2;
    const endX = startX + deltaX;
    const endY = startY + deltaY;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    // HACK: Wait for snap animation to complete
    await page.waitForTimeout(300);
  };

  const rightClickToolbarToggle = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const toggleButton = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar-toggle]",
      );
      if (!toggleButton) return;
      toggleButton.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      );
    }, ATTRIBUTE_NAME);
    await page.waitForTimeout(200);
  };

  const isToolbarMenuVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const dropdowns = root.querySelectorAll<HTMLElement>(
        "[data-react-grab-toolbar-menu]",
      );
      for (let index = 0; index < dropdowns.length; index++) {
        const dropdown = dropdowns[index];
        if (
          dropdown.classList.contains("fixed") &&
          getComputedStyle(dropdown).pointerEvents !== "none"
        ) {
          return true;
        }
      }
      return false;
    }, ATTRIBUTE_NAME);
  };

  const getToolbarMenuItemLabels = async (): Promise<string[]> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return [];
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return [];
      const dropdowns = root.querySelectorAll<HTMLElement>(
        "[data-react-grab-toolbar-menu]",
      );
      for (const dropdown of dropdowns) {
        if (!dropdown.classList.contains("fixed")) continue;
        const items = dropdown.querySelectorAll<HTMLButtonElement>(
          "[data-react-grab-menu-item]",
        );
        return Array.from(items).map((item) => item.textContent?.trim() ?? "");
      }
      return [];
    }, ATTRIBUTE_NAME);
  };

  const clickToolbarMenuItem = async (actionId: string) => {
    await page.evaluate(
      ({ attrName, itemId }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;
        const dropdowns = root.querySelectorAll<HTMLElement>(
          "[data-react-grab-toolbar-menu]",
        );
        for (const dropdown of dropdowns) {
          if (!dropdown.classList.contains("fixed")) continue;
          const button = dropdown.querySelector<HTMLButtonElement>(
            `[data-react-grab-menu-item="${itemId}"]`,
          );
          button?.click();
          return;
        }
      },
      { attrName: ATTRIBUTE_NAME, itemId: actionId },
    );
  };

  const isCommentsButtonVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const commentsButton = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar-comments]",
      );
      if (!commentsButton) return false;
      const gridParent = commentsButton.parentElement?.parentElement;
      if (!gridParent) return false;
      const computedStyle = window.getComputedStyle(gridParent);
      return computedStyle.opacity !== "0";
    }, ATTRIBUTE_NAME);
  };

  const waitForCommentsDropdown = async (visible: boolean) => {
    await page.waitForFunction(
      ({ attrName, expectedVisible }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return !expectedVisible;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return !expectedVisible;
        const dropdown = root.querySelector<HTMLElement>(
          "[data-react-grab-comments-dropdown]",
        );
        if (!expectedVisible) return dropdown === null;
        if (!dropdown) return false;
        return getComputedStyle(dropdown).pointerEvents !== "none";
      },
      { attrName: ATTRIBUTE_NAME, expectedVisible: visible },
      { timeout: 5000 },
    );
  };

  const clickShadowRootButton = async (selector: string) => {
    await page.evaluate(
      ({ attrName, buttonSelector }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;
        root.querySelector<HTMLButtonElement>(buttonSelector)?.click();
      },
      { attrName: ATTRIBUTE_NAME, buttonSelector: selector },
    );
  };

  const clickCommentsButton = async () => {
    const wasOpen = await isCommentsDropdownVisible();
    await clickShadowRootButton("[data-react-grab-toolbar-comments]");
    await waitForCommentsDropdown(!wasOpen);
  };

  const isCommentsDropdownVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const dropdown = root.querySelector(
        "[data-react-grab-comments-dropdown]",
      );
      return dropdown !== null;
    }, ATTRIBUTE_NAME);
  };

  const getCommentsDropdownInfo = async (): Promise<CommentsDropdownInfo> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return { isVisible: false, itemCount: 0 };
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return { isVisible: false, itemCount: 0 };
      const dropdown = root.querySelector(
        "[data-react-grab-comments-dropdown]",
      );
      if (!dropdown) return { isVisible: false, itemCount: 0 };

      return {
        isVisible: true,
        itemCount: dropdown.querySelectorAll("[data-react-grab-comment-item]")
          .length,
      };
    }, ATTRIBUTE_NAME);
  };

  const clickCommentItem = async (index: number) => {
    await page.evaluate(
      ({ attrName, itemIndex }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return;
        const items = root.querySelectorAll<HTMLButtonElement>(
          "[data-react-grab-comment-item]",
        );
        items[itemIndex]?.click();
      },
      { attrName: ATTRIBUTE_NAME, itemIndex: index },
    );
  };

  const clickCommentsCopyAll = async () => {
    await clickShadowRootButton("[data-react-grab-comments-copy-all]");
  };

  const clickCommentsClear = async () => {
    await clickShadowRootButton("[data-react-grab-comments-clear]");
    await waitForCommentsDropdown(false);
  };

  const hoverCommentItem = async (index: number) => {
    const itemRect = await page.evaluate(
      ({ attrName, itemIndex }) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return null;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return null;
        const items = root.querySelectorAll("[data-react-grab-comment-item]");
        const button = items[itemIndex];
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      },
      { attrName: ATTRIBUTE_NAME, itemIndex: index },
    );
    if (itemRect) {
      await page.mouse.move(
        itemRect.x + itemRect.width / 2,
        itemRect.y + itemRect.height / 2,
      );
      await page.waitForTimeout(100);
    }
  };

  const hoverCommentsButton = async () => {
    const buttonRect = await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return null;
      const button = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar-comments]",
      );
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, ATTRIBUTE_NAME);
    if (buttonRect) {
      await page.mouse.move(
        buttonRect.x + buttonRect.width / 2,
        buttonRect.y + buttonRect.height / 2,
      );
      await page.waitForTimeout(100);
    }
  };

  const hoverCopyAllButton = async () => {
    const buttonRect = await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return null;
      const button = root.querySelector<HTMLElement>(
        "[data-react-grab-comments-copy-all]",
      );
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, ATTRIBUTE_NAME);
    if (buttonRect) {
      await page.mouse.move(
        buttonRect.x + buttonRect.width / 2,
        buttonRect.y + buttonRect.height / 2,
      );
      await page.waitForTimeout(100);
    }
  };

  const clickToolbarCopyAll = async () => {
    await clickShadowRootButton("[data-react-grab-toolbar-copy-all]");
  };

  const isToolbarCopyAllVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const copyAllButton = root.querySelector<HTMLElement>(
        "[data-react-grab-toolbar-copy-all]",
      );
      if (!copyAllButton) return false;
      const gridParent = copyAllButton.parentElement?.parentElement;
      if (!gridParent) return false;
      const computedStyle = window.getComputedStyle(gridParent);
      return computedStyle.opacity !== "0";
    }, ATTRIBUTE_NAME);
  };

  const isClearCommentsPromptVisible = async (): Promise<boolean> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return false;
      const prompt = root.querySelector<HTMLElement>(
        "[data-react-grab-clear-comments-prompt]",
      );
      if (!prompt) return false;
      return getComputedStyle(prompt).pointerEvents !== "none";
    }, ATTRIBUTE_NAME);
  };

  const confirmClearCommentsPrompt = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const prompt = root.querySelector(
        "[data-react-grab-clear-comments-prompt]",
      );
      if (!prompt) return;
      const yesButton = prompt.querySelector<HTMLButtonElement>(
        "[data-react-grab-discard-yes]",
      );
      yesButton?.click();
    }, ATTRIBUTE_NAME);
  };

  const cancelClearCommentsPrompt = async () => {
    await page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return;
      const prompt = root.querySelector(
        "[data-react-grab-clear-comments-prompt]",
      );
      if (!prompt) return;
      const noButton = prompt.querySelector<HTMLButtonElement>(
        "[data-react-grab-discard-no]",
      );
      noButton?.click();
    }, ATTRIBUTE_NAME);
  };

  const getCommentsDropdownPosition = async (): Promise<{
    left: number;
    top: number;
  } | null> => {
    return page.evaluate((attrName) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const root = shadowRoot.querySelector(`[${attrName}]`);
      if (!root) return null;
      const dropdown = root.querySelector<HTMLElement>(
        "[data-react-grab-comments-dropdown]",
      );
      if (!dropdown) return null;
      return {
        left: parseFloat(dropdown.style.left),
        top: parseFloat(dropdown.style.top),
      };
    }, ATTRIBUTE_NAME);
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

  const getSelectionLabelBounds =
    async (): Promise<SelectionLabelBounds | null> => {
      return page.evaluate((attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return null;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return null;

        const label = root.querySelector<HTMLElement>(
          "[data-react-grab-selection-label]",
        );
        if (!label) return null;

        const toRect = (rect: DOMRect) => ({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });

        const arrowElement = label.querySelector<HTMLElement>(
          "[data-react-grab-arrow]",
        );

        return {
          label: toRect(label.getBoundingClientRect()),
          arrow: arrowElement
            ? toRect(arrowElement.getBoundingClientRect())
            : null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        };
      }, ATTRIBUTE_NAME);
    };

  const isSelectionLabelVisible = async (): Promise<boolean> => {
    const info = await getSelectionLabelInfo();
    return info.isVisible;
  };

  const waitForSelectionLabel = async () => {
    await page.waitForFunction(
      (attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        const label = root.querySelector("[data-react-grab-selection-label]");
        return label !== null;
      },
      ATTRIBUTE_NAME,
      { timeout: 2000 },
    );
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

  const getGrabbedBoxInfo = async (): Promise<GrabbedBoxInfo> => {
    return page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => {
              grabbedBoxes: Array<{
                id: string;
                bounds: { x: number; y: number; width: number; height: number };
                createdAt: number;
              }>;
            };
          };
        }
      ).__REACT_GRAB__;

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

  const getLabelInstancesInfo = async (): Promise<LabelInstanceInfo[]> => {
    return page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => {
              labelInstances: Array<{
                id: string;
                status: string;
                tagName: string;
                componentName?: string;
                createdAt: number;
              }>;
            };
          };
        }
      ).__REACT_GRAB__;

      const state = api?.getState();
      return (state?.labelInstances ?? []).map((instance) => ({
        id: instance.id,
        status: instance.status,
        tagName: instance.tagName,
        componentName: instance.componentName,
        createdAt: instance.createdAt,
      }));
    });
  };

  const isGrabbedBoxVisible = async (): Promise<boolean> => {
    return page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => {
              grabbedBoxes: Array<{ id: string }>;
            };
          };
        }
      ).__REACT_GRAB__;

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
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => {
              isDragBoxVisible: boolean;
              dragBounds: {
                x: number;
                y: number;
                width: number;
                height: number;
              } | null;
            };
          };
        }
      ).__REACT_GRAB__;
      const state = api?.getState();
      if (!state?.isDragBoxVisible || !state?.dragBounds) return null;
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
      const api = (
        window as {
          __REACT_GRAB__?: {
            getState: () => {
              isSelectionBoxVisible: boolean;
              targetElement: Element | null;
            };
          };
        }
      ).__REACT_GRAB__;
      const state = api?.getState();
      if (!state?.isSelectionBoxVisible || !state?.targetElement) return null;
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
          grabbedBoxes: [],
          labelInstances: [],
        }
      );
    });
  };

  const toggle = async () => {
    const wasActive = await isOverlayVisible();
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { toggle: () => void } })
        .__REACT_GRAB__;
      api?.toggle();
    });
    await waitForActive(!wasActive);
  };

  const dispose = async () => {
    await page.evaluate(() => {
      const api = (window as { __REACT_GRAB__?: { dispose: () => void } })
        .__REACT_GRAB__;
      api?.dispose();
    });
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

  const registerCommentAction = async () => {
    await page.evaluate(() => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: {
              name: string;
              actions: Array<Record<string, unknown>>;
            }) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("comment-action");
      api?.registerPlugin({
        name: "comment-action",
        actions: [
          {
            id: "comment-action",
            label: "Edit",
            shortcut: "Enter",
            onAction: (context: {
              enterPromptMode?: () => void;
            }) => {
              context.enterPromptMode?.();
            },
          },
        ],
      });
    });
  };

  const setAgent = async (options: Record<string, unknown>) => {
    await page.evaluate((opts) => {
      const api = (
        window as {
          __REACT_GRAB__?: {
            unregisterPlugin: (name: string) => void;
            registerPlugin: (plugin: {
              name: string;
              actions: Array<Record<string, unknown>>;
            }) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("test-agent");
      const agent = opts;
      api?.registerPlugin({
        name: "test-agent",
        actions: [
          {
            id: "edit-with-test-agent",
            label: "Edit",
            shortcut: "Enter",
            onAction: (context: {
              enterPromptMode?: (agent?: Record<string, unknown>) => void;
            }) => {
              context.enterPromptMode?.(agent);
            },
            agent,
          },
        ],
      });
    }, options);
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

      const pluginKeys = ["theme", "actions"];
      const hookKeys = [
        "onActivate",
        "onDeactivate",
        "onElementHover",
        "onElementSelect",
        "onDragStart",
        "onDragEnd",
        "onBeforeCopy",
        "onAfterCopy",
        "onCopySuccess",
        "onCopyError",
        "onStateChange",
        "onPromptModeChange",
        "onSelectionBox",
        "onDragBox",
        "onGrabbedBox",
        "onContextMenu",
        "onOpenFile",
        "onElementLabel",
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
    await page.waitForFunction(
      () => {
        const api = (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__;
        return api !== undefined;
      },
      undefined,
      { timeout: 5000 },
    );
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
            registerPlugin: (plugin: {
              name: string;
              actions: Array<Record<string, unknown>>;
            }) => void;
          };
        }
      ).__REACT_GRAB__;
      api?.unregisterPlugin("mock-agent");
      const agent = { provider: mockProvider };
      api?.registerPlugin({
        name: "mock-agent",
        actions: [
          {
            id: "edit-with-mock-agent",
            label: "Edit",
            shortcut: "Enter",
            onAction: (context: {
              enterPromptMode?: (agent?: Record<string, unknown>) => void;
            }) => {
              context.enterPromptMode?.(agent);
            },
            agent,
          },
        ],
      });
    }, options);
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
    await page.waitForFunction(
      (attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        const sessionElements = Array.from(
          root.querySelectorAll("[data-react-grab-ignore-events]"),
        );
        for (let i = 0; i < sessionElements.length; i++) {
          const text = sessionElements[i].textContent ?? "";
          if (
            text.includes("Processing") ||
            text.includes("Completed") ||
            text.includes("Error") ||
            text.includes("Grabbing")
          ) {
            return true;
          }
        }
        return false;
      },
      ATTRIBUTE_NAME,
      { timeout },
    );
  };

  const waitForAgentComplete = async (timeout = 10000) => {
    await page.waitForFunction(
      (attrName) => {
        const host = document.querySelector(`[${attrName}]`);
        const shadowRoot = host?.shadowRoot;
        if (!shadowRoot) return false;
        const root = shadowRoot.querySelector(`[${attrName}]`);
        if (!root) return false;
        const sessionElements = Array.from(
          root.querySelectorAll("[data-react-grab-ignore-events]"),
        );
        let hasSession = false;
        let isStreaming = false;
        for (let i = 0; i < sessionElements.length; i++) {
          const text = sessionElements[i].textContent ?? "";
          if (
            text.includes("Processing") ||
            text.includes("Completed") ||
            text.includes("Error") ||
            text.includes("Grabbing")
          ) {
            hasSession = true;
            if (text.includes("Processing") || text.includes("Grabbing")) {
              isStreaming = true;
            }
          }
        }
        return hasSession && !isStreaming;
      },
      ATTRIBUTE_NAME,
      { timeout },
    );
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
  };

  const dispatchPointerEvent = async (
    type: "pointerdown" | "pointermove" | "pointerup",
    x: number,
    y: number,
    pointerId = 1,
  ) => {
    await page.evaluate(
      ({ type, x, y, pointerId }) => {
        const target = document.elementFromPoint(x, y) || document.body;
        const pointerEvent = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          pointerId,
          pointerType: "touch",
          isPrimary: true,
          button: type === "pointermove" ? -1 : 0,
          buttons: type === "pointerup" ? 0 : 1,
        });
        target.dispatchEvent(pointerEvent);
      },
      { type, x, y, pointerId },
    );
  };

  const touchStart = async (x: number, y: number) => {
    await dispatchPointerEvent("pointerdown", x, y);
  };

  const touchMove = async (x: number, y: number) => {
    await dispatchPointerEvent("pointermove", x, y);
  };

  const touchEnd = async (x: number, y: number) => {
    await dispatchPointerEvent("pointerup", x, y);
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
    await dispatchPointerEvent("pointerdown", startX, startY);

    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const currentX = startX + ((endX - startX) * i) / steps;
      const currentY = startY + ((endY - startY) * i) / steps;
      await dispatchPointerEvent("pointermove", currentX, currentY);
    }

    await dispatchPointerEvent("pointerup", endX, endY);
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
    await page.waitForFunction(
      ({ expectedWidth, expectedHeight }) =>
        window.innerWidth === expectedWidth &&
        window.innerHeight === expectedHeight,
      { expectedWidth: width, expectedHeight: height },
      { timeout: 2000 },
    );
    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
    });
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
  };

  const hideElement = async (selector: string) => {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) element.style.display = "none";
    }, selector);
  };

  const showElement = async (selector: string) => {
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLElement;
      if (element) element.style.display = "";
    }, selector);
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

  const isDropdownOpen = async (): Promise<boolean> => {
    const dropdownMenu = page.locator('[data-testid="dropdown-menu"]');
    return dropdownMenu.isVisible();
  };

  const openDropdown = async () => {
    const trigger = page.locator('[data-testid="dropdown-trigger"]');
    await trigger.click();
    await page.waitForSelector('[data-testid="dropdown-menu"]', {
      state: "visible",
      timeout: 2000,
    });
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
            registerPlugin: (plugin: {
              name: string;
              hooks: Record<string, unknown>;
            }) => void;
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
    await page.waitForFunction(
      (callbackName) => {
        const history =
          (window as { __CALLBACK_HISTORY__?: Array<{ name: string }> })
            .__CALLBACK_HISTORY__ ?? [];
        return history.some((c) => c.name === callbackName);
      },
      name,
      { timeout },
    );
    const history = await getCallbackHistory();
    const callback = history.find((c) => c.name === name);
    return callback?.args ?? [];
  };

  return {
    page,
    modifierKey: MODIFIER_KEY,
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
    captureNextClipboardWrites,
    waitForSelectionBox,
    waitForSelectionSource,
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
    pressModifierKeyCombo,
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
    clickToolbarEnabled,
    dragToolbar,
    dragToolbarFromButton,

    rightClickToolbarToggle,
    isToolbarMenuVisible,
    getToolbarMenuItemLabels,
    clickToolbarMenuItem,

    isCommentsButtonVisible,
    clickCommentsButton,
    isCommentsDropdownVisible,
    getCommentsDropdownInfo,
    clickCommentItem,
    clickCommentsCopyAll,
    clickCommentsClear,
    hoverCommentItem,
    hoverCommentsButton,
    hoverCopyAllButton,
    clickToolbarCopyAll,
    isToolbarCopyAllVisible,
    isClearCommentsPromptVisible,
    confirmClearCommentsPrompt,
    cancelClearCommentsPrompt,
    getCommentsDropdownPosition,

    getSelectionLabelInfo,
    getSelectionLabelBounds,
    isSelectionLabelVisible,
    waitForSelectionLabel,
    getLabelStatusText,

    getGrabbedBoxInfo,
    getLabelInstancesInfo,
    isGrabbedBoxVisible,
    getDragBoxBounds,
    getSelectionBoxBounds,

    getState,
    toggle,
    dispose,
    copyElementViaApi,
    registerCommentAction,
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
    isDropdownOpen,
    openDropdown,

    setupCallbackTracking,
    getCallbackHistory,
    clearCallbackHistory,
    waitForCallback,
  };
};

export const test = base.extend<{ reactGrab: ReactGrabPageObject }>({
  reactGrab: async ({ page }, use) => {
    const waitForApiReady = async () => {
      await page.waitForFunction(
        () => {
          const api = (window as { __REACT_GRAB__?: unknown }).__REACT_GRAB__;
          return api !== undefined;
        },
        undefined,
        { timeout: PAGE_SETUP_API_TIMEOUT_MS },
      );
    };

    const initializePage = async () => {
      let lastError: unknown;
      for (
        let attemptIndex = 0;
        attemptIndex < PAGE_SETUP_MAX_ATTEMPTS;
        attemptIndex++
      ) {
        if (page.isClosed()) {
          throw new Error("Browser page closed during reactGrab fixture setup");
        }
        try {
          await page.goto("/", {
            waitUntil: "domcontentloaded",
            timeout: PAGE_SETUP_NAVIGATION_TIMEOUT_MS,
          });
          await waitForApiReady();
          return;
        } catch (error) {
          lastError = error;
          if (page.isClosed()) {
            throw lastError;
          }
          if (attemptIndex === PAGE_SETUP_MAX_ATTEMPTS - 1) {
            throw lastError;
          }
          // HACK: brief backoff helps when dev server is under heavy parallel load.
          await new Promise((resolve) => {
            setTimeout(resolve, 250 * (attemptIndex + 1));
          });
        }
      }
    };

    await initializePage();

    const reactGrab = createReactGrabPageObject(page);
    await use(reactGrab);
  },
});

export { expect };
