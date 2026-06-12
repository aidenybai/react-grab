import type { Page } from "@playwright/test";
import { expect } from "./fixtures.js";
import type { ReactGrabPageObject } from "./fixtures.js";

export const ATTRIBUTE_NAME = "data-react-grab";
export const EDIT_PANEL_ATTR = "data-react-grab-edit-panel";
export const EDIT_PROPERTY_ATTR = "data-react-grab-edit-property";
export const SEARCH_INPUT_ATTR = "data-react-grab-input";
export const COPY_BUTTON_ATTR = "data-react-grab-copy-button";
export const TAILWIND_LABEL_ATTR = "data-react-grab-tailwind-label";
export const IDLE_BUFFER_MS = 700;
export const DISCARD_PROMPT_IDLE_MS = 2000;
export const BUTTON_SELECTOR = "[data-testid='nested-button']";
export const CARD_SELECTOR = "[data-testid='nested-card']";
export const MAIN_TITLE_SELECTOR = "[data-testid='main-title']";

export const isEditPanelVisible = async (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      return shadowRoot.querySelector(`[${panelAttr}]`) !== null;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
  );

export const getVisiblePropertyKeys = async (page: Page): Promise<string[]> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return [];
      const propertyRows = shadowRoot.querySelectorAll<HTMLElement>(`[${propertyAttr}]`);
      return Array.from(propertyRows).map(
        (propertyRow) => propertyRow.getAttribute(propertyAttr) ?? "",
      );
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

export const getActivePropertyKey = async (page: Page): Promise<string | null> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const activePropertyRow = shadowRoot.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      return activePropertyRow?.getAttribute(propertyAttr) ?? null;
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

export const getActivePropertyValue = async (page: Page): Promise<string | null> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      const activePropertyRow = shadowRoot.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      if (!activePropertyRow) return null;
      const valueElement = activePropertyRow.querySelector<HTMLElement>("[data-react-grab-value]");
      if (valueElement) {
        return valueElement.getAttribute("data-react-grab-value");
      }
      return activePropertyRow.textContent?.trim() ?? null;
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

export interface ActiveSliderVisualState {
  key: string | null;
  width: number | null;
  hasBaseRail: boolean;
  fillOpacity: number | null;
  fillBackground: string | null;
  handleOpacity: number | null;
  maxHashMarkOpacity: number;
}

export interface VisibleSliderVisualState {
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
  maxHashMarkOpacity: number;
}

export interface PropertyRowBounds {
  key: string;
  isActive: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}

export const getActiveSliderVisualState = async (page: Page): Promise<ActiveSliderVisualState> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const activePropertyRow = shadowRoot?.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      const slider = activePropertyRow?.querySelector<HTMLElement>("[role='slider']");
      const baseRailElement =
        slider?.querySelector<HTMLElement>("[data-react-grab-slider-base]") ?? null;
      const fillElement = slider?.querySelector<HTMLElement>("[data-react-grab-slider-fill]");
      const handleElement = slider?.querySelector<HTMLElement>("[data-react-grab-slider-handle]");
      const hashMarks = Array.from(
        slider?.querySelectorAll<HTMLElement>("[data-react-grab-slider-hash-mark]") ?? [],
      );
      const fillStyle = fillElement ? getComputedStyle(fillElement) : null;
      return {
        key: activePropertyRow?.getAttribute(propertyAttr) ?? null,
        width: slider?.getBoundingClientRect().width ?? null,
        hasBaseRail: baseRailElement !== null,
        fillOpacity: fillStyle ? Number(fillStyle.opacity) : null,
        fillBackground: fillStyle?.backgroundColor ?? null,
        handleOpacity: handleElement ? Number(getComputedStyle(handleElement).opacity) : null,
        maxHashMarkOpacity: Math.max(
          0,
          ...hashMarks.map((hashMark) => Number(getComputedStyle(hashMark).opacity)),
        ),
      };
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

export const getVisibleSliderVisualState = async (page: Page): Promise<VisibleSliderVisualState> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const sliderElements = Array.from(
        shadowRoot?.querySelectorAll<HTMLElement>(`[${panelAttr}] [role='slider']`) ?? [],
      );
      const visibleSlider =
        sliderElements.find((sliderElement) => {
          const sliderBounds = sliderElement.getBoundingClientRect();
          return sliderBounds.width > 0 && sliderBounds.height > 0;
        }) ?? null;
      const sliderBounds = visibleSlider?.getBoundingClientRect();
      const hashMarks = Array.from(
        visibleSlider?.querySelectorAll<HTMLElement>("[data-react-grab-slider-hash-mark]") ?? [],
      );
      return {
        left: sliderBounds?.left ?? null,
        top: sliderBounds?.top ?? null,
        width: sliderBounds?.width ?? null,
        height: sliderBounds?.height ?? null,
        maxHashMarkOpacity: Math.max(
          0,
          ...hashMarks.map((hashMark) => Number(getComputedStyle(hashMark).opacity)),
        ),
      };
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
  );

export const hoverVisibleSlider = async (page: Page): Promise<void> => {
  const sliderVisualState = await getVisibleSliderVisualState(page);
  if (
    sliderVisualState.left === null ||
    sliderVisualState.top === null ||
    sliderVisualState.width === null ||
    sliderVisualState.height === null
  ) {
    throw new Error("Visible slider not found");
  }
  await page.mouse.move(
    sliderVisualState.left + sliderVisualState.width / 2,
    sliderVisualState.top + sliderVisualState.height / 2,
  );
};

const getActiveTailwindLabelInfo = async (
  page: Page,
): Promise<{ text: string | null; tailwindLeft: number | null; valueLeft: number | null }> =>
  page.evaluate(
    ({ attrName, tailwindLabelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const tailwindLabelElements = Array.from(
        shadowRoot?.querySelectorAll<HTMLElement>(
          `[data-react-grab-edit-panel] [${tailwindLabelAttr}]`,
        ) ?? [],
      );
      const tailwindLabel =
        tailwindLabelElements.find((element) => element.getBoundingClientRect().width > 0) ?? null;
      const valueText =
        tailwindLabel
          ?.closest("[data-react-grab-value]")
          ?.querySelector<HTMLElement>("[data-react-grab-value-text]") ?? null;
      return {
        text: tailwindLabel?.textContent ?? null,
        tailwindLeft: tailwindLabel?.getBoundingClientRect().left ?? null,
        valueLeft: valueText?.getBoundingClientRect().left ?? null,
      };
    },
    { attrName: ATTRIBUTE_NAME, tailwindLabelAttr: TAILWIND_LABEL_ATTR },
  );

export const getActiveTailwindLabelOrder = async (
  page: Page,
): Promise<{ tailwindLeft: number | null; valueLeft: number | null }> => {
  const { tailwindLeft, valueLeft } = await getActiveTailwindLabelInfo(page);
  return { tailwindLeft, valueLeft };
};

export const getActiveTailwindLabelText = async (page: Page): Promise<string | null> =>
  (await getActiveTailwindLabelInfo(page)).text;

export interface SearchInputFocusVisualState {
  isFocusVisible: boolean;
  outlineStyle: string;
  boxShadow: string;
}

export const getSearchInputFocusVisualState = async (
  page: Page,
): Promise<SearchInputFocusVisualState> =>
  page.evaluate(
    ({ attrName, inputAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const input = host?.shadowRoot?.querySelector<HTMLElement>(`[${inputAttr}]`);
      if (!input) {
        return { isFocusVisible: false, outlineStyle: "", boxShadow: "" };
      }
      const computedStyle = getComputedStyle(input);
      return {
        isFocusVisible: input.matches(":focus-visible"),
        outlineStyle: computedStyle.outlineStyle,
        boxShadow: computedStyle.boxShadow,
      };
    },
    { attrName: ATTRIBUTE_NAME, inputAttr: SEARCH_INPUT_ATTR },
  );

export interface OverlayFocusVisualState {
  label: string;
  outlineStyle: string;
  boxShadow: string;
}

export const getOverlayFocusVisualStates = async (
  page: Page,
  elementSelector: string,
): Promise<OverlayFocusVisualState[]> =>
  page.evaluate(
    ({ attrName, elementSelector }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const root = shadowRoot?.querySelector(`[${attrName}]`) ?? shadowRoot;
      const elements = Array.from(root?.querySelectorAll<HTMLElement>(elementSelector) ?? []);
      return elements
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          element.focus({ preventScroll: true });
          const computedStyle = getComputedStyle(element);
          return {
            label:
              element.getAttribute("data-react-grab-menu-item") ??
              element.getAttribute("data-react-grab-edit-property") ??
              element.getAttribute("aria-label") ??
              element.getAttribute("role") ??
              element.tagName.toLowerCase(),
            outlineStyle: computedStyle.outlineStyle,
            boxShadow: computedStyle.boxShadow,
          };
        });
    },
    { attrName: ATTRIBUTE_NAME, elementSelector },
  );

export const typeInSearchInput = async (page: Page, text: string): Promise<void> => {
  await page.evaluate(
    ({ attrName, inputAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) throw new Error("No shadow root");
      const input = shadowRoot.querySelector<HTMLTextAreaElement>(`[${inputAttr}]`);
      if (!input) throw new Error("Search input not found");
      input.focus();
    },
    { attrName: ATTRIBUTE_NAME, inputAttr: SEARCH_INPUT_ATTR },
  );
  await page.keyboard.type(text);
};

export const setSearchInputValue = async (page: Page, value: string): Promise<void> => {
  await page.evaluate(
    ({ attrName, inputAttr, nextValue }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) throw new Error("No shadow root");
      const input = shadowRoot.querySelector<HTMLTextAreaElement>(`[${inputAttr}]`);
      if (!input) throw new Error("Search input not found");
      input.focus();
      input.value = nextValue;
      input.dispatchEvent(
        new InputEvent("input", { bubbles: true, composed: true, data: nextValue }),
      );
    },
    { attrName: ATTRIBUTE_NAME, inputAttr: SEARCH_INPUT_ATTR, nextValue: value },
  );
};

export const getInlineStyleProperty = async (
  page: Page,
  selector: string,
  property: string,
): Promise<string> =>
  page.evaluate(
    ({ elementSelector, propertyName }) => {
      const element = document.querySelector(elementSelector);
      if (!(element instanceof HTMLElement)) return "";
      return element.style.getPropertyValue(propertyName);
    },
    { elementSelector: selector, propertyName: property },
  );

export const getInlineStyleAttribute = async (page: Page, selector: string): Promise<string> =>
  page.evaluate((elementSelector) => {
    const element = document.querySelector(elementSelector);
    if (!(element instanceof HTMLElement)) return "";
    return element.getAttribute("style") ?? "";
  }, selector);

export const dispatchOutsideDismiss = async (page: Page): Promise<void> =>
  page.evaluate(() => {
    window.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  });

export const isEditPanelCompact = async (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const panel = shadowRoot.querySelector(`[${panelAttr}]`);
      return panel?.getAttribute("data-rg-compact") === "true";
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
  );

export const isHeaderCopyButtonVisible = async (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, copyButtonAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const copyButton = shadowRoot?.querySelector<HTMLElement>(`[${copyButtonAttr}]`);
      if (!copyButton) return false;
      const copyButtonBounds = copyButton.getBoundingClientRect();
      return copyButtonBounds.width > 0 && copyButtonBounds.height > 0;
    },
    { attrName: ATTRIBUTE_NAME, copyButtonAttr: COPY_BUTTON_ATTR },
  );

export interface ButtonVisualStyle {
  backgroundColor: string;
  borderColor: string;
  color: string;
  height: string;
  paddingLeft: string;
  paddingRight: string;
}

export const getOverlayButtonVisualStyle = async (
  page: Page,
  selector: string,
): Promise<ButtonVisualStyle> =>
  page.evaluate(
    ({ attrName, buttonSelector }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const button = shadowRoot?.querySelector<HTMLElement>(buttonSelector);
      if (!button) throw new Error("Button not found");
      const label = button.querySelector<HTMLElement>("span") ?? button;
      const buttonStyle = getComputedStyle(button);
      const labelStyle = getComputedStyle(label);
      return {
        backgroundColor: buttonStyle.backgroundColor,
        borderColor: buttonStyle.borderColor,
        color: labelStyle.color,
        height: buttonStyle.height,
        paddingLeft: buttonStyle.paddingLeft,
        paddingRight: buttonStyle.paddingRight,
      };
    },
    { attrName: ATTRIBUTE_NAME, buttonSelector: selector },
  );

export const isDiscardPromptVisible = async (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const confirmButton = shadowRoot?.querySelector<HTMLElement>(
        "[data-react-grab-discard-button='confirm']",
      );
      if (!confirmButton) return false;
      const confirmButtonBounds = confirmButton.getBoundingClientRect();
      return confirmButtonBounds.width > 0 && confirmButtonBounds.height > 0;
    },
    { attrName: ATTRIBUTE_NAME },
  );

// Reach the discard prompt via the keyboard. From a compact panel the
// first Escape only expands it, so a second is needed; from the full
// panel one Escape is enough. Returns once the prompt is visible.
export const openDiscardPromptViaEscape = async (page: Page): Promise<void> => {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    if (await isDiscardPromptVisible(page)) return;
  }
};

export const focusDiscardButton = async (
  page: Page,
  action: "cancel" | "confirm",
): Promise<void> => {
  await page.evaluate(
    ({ attrName, actionName }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const button = shadowRoot?.querySelector<HTMLButtonElement>(
        `[data-react-grab-discard-button='${actionName}']`,
      );
      if (!button) throw new Error("Discard button not found");
      button.focus();
    },
    { attrName: ATTRIBUTE_NAME, actionName: action },
  );
};

export const clickHeaderCopyButton = async (page: Page): Promise<void> => {
  await page.evaluate(
    ({ attrName, copyButtonAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const button = shadowRoot?.querySelector<HTMLButtonElement>(`[${copyButtonAttr}]`);
      if (!button) throw new Error("Copy button not found");
      button.click();
    },
    { attrName: ATTRIBUTE_NAME, copyButtonAttr: COPY_BUTTON_ATTR },
  );
};

export const dragActiveSlider = async (page: Page): Promise<void> => {
  const sliderBounds = await page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const activePropertyRow = shadowRoot?.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      const slider = activePropertyRow?.querySelector<HTMLElement>("[role='slider']");
      if (!slider) throw new Error("Active slider not found");
      const bounds = slider.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      };
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );
  const sliderCenterY = sliderBounds.top + sliderBounds.height / 2;
  await page.mouse.move(sliderBounds.left + sliderBounds.width * 0.25, sliderCenterY);
  await page.mouse.down();
  await page.mouse.move(sliderBounds.left + sliderBounds.width * 0.75, sliderCenterY, {
    steps: 4,
  });
  await page.mouse.up();
};

export const getPropertyRowBounds = async (page: Page): Promise<PropertyRowBounds[]> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const propertyRows = Array.from(
        shadowRoot?.querySelectorAll<HTMLElement>(`[${propertyAttr}]`) ?? [],
      );
      return propertyRows.map((propertyRow) => {
        const propertyRowBounds = propertyRow.getBoundingClientRect();
        return {
          key: propertyRow.getAttribute(propertyAttr) ?? "",
          isActive: propertyRow.getAttribute("aria-current") === "true",
          left: propertyRowBounds.left,
          top: propertyRowBounds.top,
          width: propertyRowBounds.width,
          height: propertyRowBounds.height,
        };
      });
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

export const getEditPanelCompactAttr = async (page: Page): Promise<string | null> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
      return panel?.getAttribute("data-rg-compact") ?? null;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
  );

export const readSessionStorageEntries = async (page: Page): Promise<Record<string, string>> =>
  page.evaluate(() => {
    const sessionStorageEntries: Record<string, string> = {};
    for (let storageIndex = 0; storageIndex < sessionStorage.length; storageIndex++) {
      const sessionStorageKey = sessionStorage.key(storageIndex);
      if (sessionStorageKey?.startsWith("react-grab:edit:")) {
        sessionStorageEntries[sessionStorageKey] = sessionStorage.getItem(sessionStorageKey) ?? "";
      }
    }
    return sessionStorageEntries;
  });

export const clearEditStorage = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const editStorageKeysToRemove: string[] = [];
    for (let storageIndex = 0; storageIndex < sessionStorage.length; storageIndex++) {
      const sessionStorageKey = sessionStorage.key(storageIndex);
      if (sessionStorageKey?.startsWith("react-grab:edit:")) {
        editStorageKeysToRemove.push(sessionStorageKey);
      }
    }
    for (const sessionStorageKey of editStorageKeysToRemove) {
      sessionStorage.removeItem(sessionStorageKey);
    }
  });
};

export const openEditPanel = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<void> => {
  await reactGrab.activate();
  await reactGrab.hoverUntilSelected(selector);
  await reactGrab.rightClickElement(selector);
  await reactGrab.clickContextMenuItem("Style");
  await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);
};
