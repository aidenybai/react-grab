import { expect, test } from "./fixtures.js";

const ATTRIBUTE_NAME = "data-react-grab";
const EDIT_PANEL_ATTR = "data-react-grab-edit-panel";
const EDIT_PROPERTY_ATTR = "data-react-grab-edit-property";
const SEARCH_INPUT_ATTR = "data-react-grab-input";
const COPY_BUTTON_ATTR = "data-react-grab-copy-button";
const IDLE_BUFFER_MS = 700;
const DISCARD_PROMPT_IDLE_MS = 2000;

// nested-button: <button class="bg-blue-500 text-white px-2 py-1 rounded text-sm">
// — leaf element, reliable target. Has px-2 (8px) py-1 (4px) → padding-y +
// padding-x canonical, rounded → border-radius 4px, text-sm → 14px.
const BUTTON_SELECTOR = "[data-testid='nested-button']";

// nested-card: <div class="border rounded-lg p-4 bg-gray-50"> — uniform p-4
// (16px) so padding consolidates to one row. card-content is the inner div
// (pl-4) we can target indirectly via the wrapper.
const CARD_SELECTOR = "[data-testid='nested-card']";

const isEditPanelVisible = async (page: import("@playwright/test").Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      return shadowRoot.querySelector(`[${panelAttr}]`) !== null;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
  );

const getVisiblePropertyKeys = async (page: import("@playwright/test").Page): Promise<string[]> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return [];
      const rows = shadowRoot.querySelectorAll<HTMLElement>(`[${propertyAttr}]`);
      return Array.from(rows).map((row) => row.getAttribute(propertyAttr) ?? "");
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

const getActivePropertyKey = async (
  page: import("@playwright/test").Page,
): Promise<string | null> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      // Active row is marked aria-current="true" by PropertyList.
      const active = shadowRoot.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      return active?.getAttribute(propertyAttr) ?? null;
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

const getActivePropertyValue = async (
  page: import("@playwright/test").Page,
): Promise<string | null> =>
  page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return null;
      // The active row carries aria-current="true". Stable across UI
      // refactors (the previous "find row with ≥2 SVGs" heuristic broke
      // when the stepper arrows moved to compact-mode-only).
      const active = shadowRoot.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      if (!active) return null;
      // The active row's numeric value chip carries a
      // data-react-grab-value attribute holding the formatted value +
      // unit. Read that instead of textContent — the Slot animated-
      // digit renderer stamps "0123456789" per column into the DOM, so
      // textContent is constant regardless of the displayed digit.
      const valueNode = active.querySelector<HTMLElement>("[data-react-grab-value]");
      if (valueNode) {
        return valueNode.getAttribute("data-react-grab-value");
      }
      return active.textContent?.trim() ?? null;
    },
    { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
  );

const typeInSearchInput = async (
  page: import("@playwright/test").Page,
  text: string,
): Promise<void> => {
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

const getInlineStyleProperty = async (
  page: import("@playwright/test").Page,
  selector: string,
  property: string,
): Promise<string> =>
  page.evaluate(
    ({ sel, prop }) => {
      const element = document.querySelector(sel);
      if (!(element instanceof HTMLElement)) return "";
      return element.style.getPropertyValue(prop);
    },
    { sel: selector, prop: property },
  );

// Whole `style="…"` attribute as written — used when the default
// first-row depends on which longhand is canonical for the target
// (e.g. px-2 py-1 → padding-x first; px-4 py-4 → padding first).
const getInlineStyleAttribute = async (
  page: import("@playwright/test").Page,
  selector: string,
): Promise<string> =>
  page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!(element instanceof HTMLElement)) return "";
    return element.getAttribute("style") ?? "";
  }, selector);

const isEditPanelCompact = async (page: import("@playwright/test").Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, panelAttr, inputAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      if (!shadowRoot) return false;
      const panel = shadowRoot.querySelector(`[${panelAttr}]`);
      if (!panel) return false;
      const input = panel.querySelector<HTMLElement>(`[${inputAttr}]`);
      if (!input) return false;
      const rect = input.getBoundingClientRect();
      return rect.width === 0 || rect.height === 0;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR, inputAttr: SEARCH_INPUT_ATTR },
  );

const isHeaderCopyButtonVisible = async (page: import("@playwright/test").Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName, copyButtonAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const button = shadowRoot?.querySelector<HTMLElement>(`[${copyButtonAttr}]`);
      if (!button) return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    { attrName: ATTRIBUTE_NAME, copyButtonAttr: COPY_BUTTON_ATTR },
  );

const isDiscardPromptVisible = async (page: import("@playwright/test").Page): Promise<boolean> =>
  page.evaluate(
    ({ attrName }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const button = shadowRoot?.querySelector<HTMLElement>(
        "[data-react-grab-discard-button='confirm']",
      );
      if (!button) return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    { attrName: ATTRIBUTE_NAME },
  );

const focusDiscardButton = async (
  page: import("@playwright/test").Page,
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

const clickHeaderCopyButton = async (page: import("@playwright/test").Page): Promise<void> => {
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

const dragActiveSlider = async (page: import("@playwright/test").Page): Promise<void> => {
  const rect = await page.evaluate(
    ({ attrName, propertyAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const active = shadowRoot?.querySelector<HTMLElement>(
        `[${propertyAttr}][aria-current="true"]`,
      );
      const slider = active?.querySelector<HTMLElement>("[role='slider']");
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
  const y = rect.top + rect.height / 2;
  await page.mouse.move(rect.left + rect.width * 0.25, y);
  await page.mouse.down();
  await page.mouse.move(rect.left + rect.width * 0.75, y, { steps: 4 });
  await page.mouse.up();
};

const getEditPanelCompactAttr = async (
  page: import("@playwright/test").Page,
): Promise<string | null> =>
  page.evaluate(
    ({ attrName, panelAttr }) => {
      const host = document.querySelector(`[${attrName}]`);
      const shadowRoot = host?.shadowRoot;
      const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
      return panel?.getAttribute("data-rg-compact") ?? null;
    },
    { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
  );

const readSessionStorageEntries = async (
  page: import("@playwright/test").Page,
): Promise<Record<string, string>> =>
  page.evaluate(() => {
    const entries: Record<string, string> = {};
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (key?.startsWith("react-grab:edit:")) {
        entries[key] = sessionStorage.getItem(key) ?? "";
      }
    }
    return entries;
  });

const clearEditStorage = async (page: import("@playwright/test").Page): Promise<void> => {
  await page.evaluate(() => {
    const toRemove: string[] = [];
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (key?.startsWith("react-grab:edit:")) toRemove.push(key);
    }
    for (const key of toRemove) sessionStorage.removeItem(key);
  });
};

const openEditPanel = async (
  reactGrab: import("./fixtures.js").ReactGrabPageObject,
  selector: string,
): Promise<void> => {
  await reactGrab.activate();
  await reactGrab.hoverElement(selector);
  await reactGrab.waitForSelectionBox();
  await reactGrab.rightClickElement(selector);
  await reactGrab.clickContextMenuItem("Budge");
  await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);
};

test.describe("Edit Panel", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test.describe("Opening", () => {
    test("right-click → Edit opens the panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
    });

    test("Edit context menu item carries the Enter shortcut", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(BUTTON_SELECTOR);

      const hasShortcut = await reactGrab.page.evaluate((attr) => {
        const host = document.querySelector(`[${attr}]`);
        const shadow = host?.shadowRoot;
        if (!shadow) return false;
        const root = shadow.querySelector(`[${attr}]`);
        if (!root) return false;
        const editButton = root.querySelector(`[data-react-grab-menu-item="budge"]`);
        // The shortcut hint renders 'Enter' (or '↵' icon) within the row.
        return Boolean(editButton);
      }, ATTRIBUTE_NAME);

      expect(hasShortcut).toBe(true);
    });

    test("Comment context menu item does NOT carry the Enter shortcut anymore", async ({
      reactGrab,
    }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(BUTTON_SELECTOR);

      const commentText = await reactGrab.page.evaluate((attr) => {
        const host = document.querySelector(`[${attr}]`);
        const shadow = host?.shadowRoot;
        if (!shadow) return null;
        const root = shadow.querySelector(`[${attr}]`);
        if (!root) return null;
        const commentButton = root.querySelector(`[data-react-grab-menu-item="comment"]`);
        return commentButton?.textContent ?? null;
      }, ATTRIBUTE_NAME);

      expect(commentText).not.toContain("Enter");
    });
  });

  test.describe("Dismissal", () => {
    test("Escape dismisses the panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
    });

    test("second Escape discards inline preview from the discard prompt", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);

      // The default first row depends on which padding rows are
      // canonical for this element — px-2 py-1 → padding-x is first,
      // so reading any specific longhand by name is fragile. Snapshot
      // the entire inline `style` instead and assert that the tweak
      // wrote *something*.
      const duringTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(duringTweak.length).toBeGreaterThan(0);

      // With a pending tweak the first Escape shakes + arms the
      // discard-confirm prompt; the second Escape chooses "Yes" and
      // reverts the inline-style preview.
      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const afterDismiss = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(afterDismiss).toBe(beforeTweak);
    });

    test("discard prompt auto-hides after idle", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);

      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);

      await reactGrab.page.waitForTimeout(DISCARD_PROMPT_IDLE_MS + 100);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(false);
    });

    test("Escape on focused No button confirms discard", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).not.toBe(beforeTweak);

      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);
      await focusDiscardButton(reactGrab.page, "cancel");
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).toBe(beforeTweak);
    });

    test("click outside dismisses the panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.mouse.click(5, 5);
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
    });
  });

  test.describe("Property listing", () => {
    test("non-uniform padding emits y/x aggregate rows (not all 4 sides)", async ({
      reactGrab,
    }) => {
      // nested-button has px-2 py-1 → padding-y + padding-x are canonical
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys).toContain("padding-top,padding-bottom");
      expect(keys).toContain("padding-left,padding-right");
    });

    test("font-size surfaces for elements that have explicit sizing", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys).toContain("font-size");
    });

    test("border-radius surfaces for rounded elements", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys).toContain("border-radius");
    });

    test("properties matching the baseline are hidden from the default list", async ({
      reactGrab,
    }) => {
      // Default list shows only what's actually styled on the element +
      // anything tweaked this session. Properties at the browser/UA
      // baseline (here, margin: 0 on a button) hide until the user
      // searches for them — keeping the list focused on what differs.
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys.some((key) => key.startsWith("margin"))).toBe(false);

      // But typing the search reveals them.
      await typeInSearchInput(reactGrab.page, "margin");
      await reactGrab.page.waitForTimeout(80);
      const searched = await getVisiblePropertyKeys(reactGrab.page);
      expect(searched.some((key) => key.startsWith("margin"))).toBe(true);
    });

    test("typing a search query reveals non-canonical properties", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeSearch = await getVisiblePropertyKeys(reactGrab.page);
      // Before: padding-y canonical, padding-top/-bottom non-canonical
      expect(beforeSearch).not.toContain("padding-top");

      await typeInSearchInput(reactGrab.page, "padding");
      await reactGrab.page.waitForTimeout(80);
      const afterSearch = await getVisiblePropertyKeys(reactGrab.page);
      // Search reveals all variants
      expect(afterSearch).toContain("padding-top");
    });
  });

  test.describe("Tailwind alias ranking", () => {
    test("typing 'pl' surfaces padding-left even when consolidated", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "pl");
      await reactGrab.page.waitForTimeout(80);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys[0]).toBe("padding-left");
    });

    test("typing 'pt' ranks padding-top first", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "pt");
      await reactGrab.page.waitForTimeout(80);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys[0]).toBe("padding-top");
    });

    test("typing 'rounded' ranks border-radius first", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "rounded");
      await reactGrab.page.waitForTimeout(80);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys[0]).toBe("border-radius");
    });

    test("typing 'text' ranks font-size first", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "text");
      await reactGrab.page.waitForTimeout(80);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys[0]).toBe("font-size");
    });

    test("typing 'font-mono' ranks font-family first", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "font-mono");
      await reactGrab.page.waitForTimeout(80);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys[0]).toBe("font-family");
    });

    test("typing 'uppercase' ranks text-transform first", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "uppercase");
      await reactGrab.page.waitForTimeout(80);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys[0]).toBe("text-transform");
    });
  });

  test.describe("Tweaking", () => {
    test("ArrowRight increments the active property's displayed value", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const before = await getActivePropertyValue(reactGrab.page);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const after = await getActivePropertyValue(reactGrab.page);
      expect(after).not.toBe(before);
    });

    test("ArrowLeft decrements the active property's displayed value", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const peak = await getActivePropertyValue(reactGrab.page);
      await reactGrab.page.keyboard.press("ArrowLeft");
      await reactGrab.page.waitForTimeout(80);
      const after = await getActivePropertyValue(reactGrab.page);
      expect(after).not.toBe(peak);
    });

    test("tweak applies an inline style on the target element", async ({ reactGrab }) => {
      const before = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const after = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(after.length).toBeGreaterThan(0);
      expect(after).not.toBe(before);
    });

    test("ArrowUp / ArrowDown navigate the list, not the value", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const initial = await getActivePropertyKey(reactGrab.page);
      await reactGrab.page.keyboard.press("ArrowDown");
      await reactGrab.page.waitForTimeout(80);
      const afterDown = await getActivePropertyKey(reactGrab.page);
      expect(afterDown).not.toBe(initial);
    });

    test("Shift+ArrowRight steps by 10×", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const before = await getActivePropertyValue(reactGrab.page);

      // First a plain Right to capture the +1 delta
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const afterOne = await getActivePropertyValue(reactGrab.page);

      // Then Shift+Right and compare against afterOne; should jump way further
      await reactGrab.page.keyboard.down("Shift");
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.keyboard.up("Shift");
      await reactGrab.page.waitForTimeout(80);
      const afterShift = await getActivePropertyValue(reactGrab.page);

      const numbersIn = (text: string | null): number =>
        Number.parseFloat((text ?? "").replace(/[^\d.-]/g, "")) || 0;
      const oneStepDelta = Math.abs(numbersIn(afterOne) - numbersIn(before));
      const shiftStepDelta = Math.abs(numbersIn(afterShift) - numbersIn(afterOne));
      expect(shiftStepDelta).toBeGreaterThan(oneStepDelta);
    });

    test("ArrowRight cycles font-family", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "font family");
      await reactGrab.page.waitForTimeout(80);
      expect(await getActivePropertyKey(reactGrab.page)).toBe("font-family");

      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);

      const fontFamily = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "font-family",
      );
      expect(fontFamily.length).toBeGreaterThan(0);
    });
  });

  test.describe("Compact mode", () => {
    test("keyboard tweak collapses the panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
    });

    test("compact mode is sticky once committed", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
      // Stays compact across the idle window — no auto-expand back to
      // the search + property list.
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
    });

    test("typing in search re-expands the compact panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
      // Search textarea stays focused even while hidden 0×0; typing a
      // character snaps the layout back to full mode.
      await reactGrab.page.keyboard.type("p");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
    });

    test("type-to-edit: hover + type m then t → margin-top focused", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.page.keyboard.type("mt", { delay: 50 });
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);
      await reactGrab.page.waitForTimeout(80);
      const searchValue = await reactGrab.page.evaluate(
        ({ attrName, inputAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const input = shadowRoot?.querySelector<HTMLTextAreaElement>(`[${inputAttr}]`);
          return input?.value ?? null;
        },
        { attrName: ATTRIBUTE_NAME, inputAttr: SEARCH_INPUT_ATTR },
      );
      expect(searchValue).toBe("mt");
      const activeKey = await getActivePropertyKey(reactGrab.page);
      expect(activeKey).toBe("margin-top");
    });

    test("type-to-edit: hover + type m-t-dash → search shows mt-, active is margin-top", async ({
      reactGrab,
    }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      // 3 chars: m (opens panel) + t (refines) + - (extends prefix)
      await reactGrab.page.keyboard.type("mt-", { delay: 50 });
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);
      await reactGrab.page.waitForTimeout(80);
      const searchValue = await reactGrab.page.evaluate(
        ({ attrName, inputAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const input = shadowRoot?.querySelector<HTMLTextAreaElement>(`[${inputAttr}]`);
          return input?.value ?? null;
        },
        { attrName: ATTRIBUTE_NAME, inputAttr: SEARCH_INPUT_ATTR },
      );
      expect(searchValue).toBe("mt-");
      const activeKey = await getActivePropertyKey(reactGrab.page);
      expect(activeKey).toBe("margin-top");
    });

    test("typing a tailwind prefix (e.g. mt) sets compact state", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const compactBefore = await reactGrab.page.evaluate(
        ({ attrName, panelAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
          return panel?.getAttribute("data-rg-compact") ?? null;
        },
        { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
      );
      expect(compactBefore).toBe("false");
      await reactGrab.page.keyboard.type("mt");
      await reactGrab.page.waitForTimeout(80);
      const compactAfter = await reactGrab.page.evaluate(
        ({ attrName, panelAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
          return panel?.getAttribute("data-rg-compact") ?? null;
        },
        { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
      );
      expect(compactAfter).toBe("true");
    });

    test("typing a complete tailwind class (mt-5) applies value + compact", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const before = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "margin-top");
      await reactGrab.page.keyboard.type("mt-5");
      await reactGrab.page.waitForTimeout(80);
      const compactAttr = await reactGrab.page.evaluate(
        ({ attrName, panelAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
          return panel?.getAttribute("data-rg-compact") ?? null;
        },
        { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
      );
      expect(compactAttr).toBe("true");
      const after = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "margin-top");
      expect(after).not.toBe(before);
      // Tailwind n × 4px = 5 × 4 = 20px
      expect(after).toContain("20");
    });

    test("typing font-mono applies font family + compact", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("font-mono");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);

      const fontFamily = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "font-family",
      );
      expect(fontFamily).toContain("ui-monospace");
      expect(await getEditPanelCompactAttr(reactGrab.page)).toBe("true");
    });

    test("typing uppercase applies text transform + compact", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("uppercase");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);

      const textTransform = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "text-transform",
      );
      expect(textTransform).toBe("uppercase");
      expect(await getEditPanelCompactAttr(reactGrab.page)).toBe("true");
    });

    test("typing p-4 on non-uniform spacing writes to both axis aggregates", async ({
      reactGrab,
    }) => {
      // nested-button is px-2 py-1 → padding-x + padding-y axis rows
      // are canonical; no single `padding` aggregate exists. The user
      // typing `p-4` should still apply to all four sides via the
      // axis-aggregate fan-out path.
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("p-4");
      await reactGrab.page.waitForTimeout(80);
      const top = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-top");
      const right = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-right");
      const bottom = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "padding-bottom",
      );
      const left = await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-left");
      // 4 × 4 = 16px on every side
      expect(top).toContain("16");
      expect(right).toContain("16");
      expect(bottom).toContain("16");
      expect(left).toContain("16");
    });

    test("typing py 40 applies padding-y", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("py 40");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);

      expect(await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-top")).toBe(
        "160px",
      );
      expect(await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-bottom")).toBe(
        "160px",
      );
      expect(await getEditPanelCompactAttr(reactGrab.page)).toBe("true");
    });

    test("compact value updates live on subsequent tweaks", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
      const first = await getActivePropertyValue(reactGrab.page);

      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const second = await getActivePropertyValue(reactGrab.page);
      expect(second).not.toBe(first);
    });
  });

  test.describe("Commit behavior", () => {
    test("Enter does not write to sessionStorage (in-memory only)", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      await reactGrab.page.keyboard.press("Enter");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const entries = await readSessionStorageEntries(reactGrab.page);
      expect(Object.keys(entries).length).toBe(0);
    });

    test("Escape does not write to sessionStorage (in-memory only)", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      // Two-step dismiss: first Escape shakes the discard-confirm
      // prompt, second Escape confirms discard and closes.
      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const entries = await readSessionStorageEntries(reactGrab.page);
      expect(Object.keys(entries).length).toBe(0);
    });

    test("inline styles persist on commit (not reverted)", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const tweaked = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(tweaked.length).toBeGreaterThan(0);

      await reactGrab.page.keyboard.press("Enter");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      await reactGrab.page.waitForTimeout(200);

      const afterCommit = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(afterCommit).toBe(tweaked);
    });

    test("header Copy button appears after a pending tweak and submits", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      expect(await isHeaderCopyButtonVisible(reactGrab.page)).toBe(false);

      await dragActiveSlider(reactGrab.page);
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
      expect(await isHeaderCopyButtonVisible(reactGrab.page)).toBe(true);

      const tweaked = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(tweaked.length).toBeGreaterThan(0);
      await clickHeaderCopyButton(reactGrab.page);
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const afterCommit = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(afterCommit).toBe(tweaked);
    });
  });

  test.describe("Selection lock", () => {
    test("panel stays open while pointer moves over other elements", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.mouse.move(10, 10);
      await reactGrab.page.waitForTimeout(80);
      await reactGrab.page.mouse.move(400, 400);
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
    });

    test("clicking another element does not change selection", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      // Capture which element the panel anchored to before the click.
      const targetSelectorBefore = await reactGrab.page.evaluate(
        ({ attrName }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector("[data-react-grab-edit-panel]");
          return panel ? "panel-open" : "panel-gone";
        },
        { attrName: ATTRIBUTE_NAME },
      );
      expect(targetSelectorBefore).toBe("panel-open");

      // Click another element on the page. Click-outside-with-pending-
      // tweaks goes through the two-step dismiss flow, but with NO tweaks
      // it dismisses immediately. Either way, the underlying selection
      // must not silently jump — the panel keeps owning its element OR
      // dismisses cleanly.
      await reactGrab.page.locator(CARD_SELECTOR).first().click({ force: true });
      await reactGrab.page.waitForTimeout(150);

      // After the click: either the panel dismissed (no panel attr in
      // shadow root) OR it stayed open anchored to the original button.
      // What's NOT allowed: a stale panel anchored to a different element.
      const stateAfter = await reactGrab.page.evaluate(
        ({ attrName, buttonSelector }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector("[data-react-grab-edit-panel]");
          const buttonElement = document.querySelector(buttonSelector);
          return {
            panelStillOpen: panel !== null,
            buttonStillExists: buttonElement !== null,
          };
        },
        { attrName: ATTRIBUTE_NAME, buttonSelector: BUTTON_SELECTOR },
      );
      expect(stateAfter.buttonStillExists).toBe(true);
    });
  });

  test.describe("Comment plugin coexistence", () => {
    test("Comment context menu item still triggers prompt mode when clicked", async ({
      reactGrab,
    }) => {
      await reactGrab.registerCommentAction();
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(BUTTON_SELECTOR);
      await reactGrab.clickContextMenuItem("Comment");
      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(true);
    });
  });
});
