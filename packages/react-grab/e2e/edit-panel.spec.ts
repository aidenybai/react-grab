import { expect, test } from "./fixtures.js";
import {
  ATTRIBUTE_NAME,
  BUTTON_SELECTOR,
  CARD_SELECTOR,
  COPY_BUTTON_ATTR,
  DISCARD_PROMPT_IDLE_MS,
  EDIT_PANEL_ATTR,
  EDIT_PROPERTY_ATTR,
  IDLE_BUFFER_MS,
  SEARCH_INPUT_ATTR,
  clearEditStorage,
  clickHeaderCopyButton,
  dispatchOutsideDismiss,
  dragActiveSlider,
  focusDiscardButton,
  getActivePropertyKey,
  getActivePropertyValue,
  getActiveSliderVisualState,
  getActiveTailwindLabelOrder,
  getEditPanelCompactAttr,
  getInlineStyleAttribute,
  getInlineStyleProperty,
  getOverlayButtonVisualStyle,
  getOverlayFocusVisualStates,
  getPropertyRowBounds,
  getSearchInputFocusVisualState,
  getVisibleSliderVisualState,
  getVisiblePropertyKeys,
  hoverVisibleSlider,
  isDiscardPromptVisible,
  isEditPanelCompact,
  isEditPanelVisible,
  isHeaderCopyButtonVisible,
  openDiscardPromptViaEscape,
  openEditPanel,
  readSessionStorageEntries,
  setSearchInputValue,
  typeInSearchInput,
} from "./edit-panel-helpers.js";

test.describe("Style Panel", () => {
  test.beforeEach(async ({ reactGrab }) => {
    await clearEditStorage(reactGrab.page);
  });

  test.describe("Opening", () => {
    test("right-click -> Style opens the panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
    });

    test("search input has no focus ring", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const focusVisualState = await getSearchInputFocusVisualState(reactGrab.page);
      expect(focusVisualState.isFocusVisible).toBe(true);
      expect(focusVisualState.outlineStyle).toBe("none");
      expect(focusVisualState.boxShadow).toBe("none");
    });

    test("context menu rows have no focus ring", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(BUTTON_SELECTOR);
      const focusVisualStates = await getOverlayFocusVisualStates(
        reactGrab.page,
        '[role="menu"], [data-react-grab-menu-item]',
      );
      expect(focusVisualStates.map((state) => state.label)).toContain("style");
      expect(
        focusVisualStates.filter(
          (state) => state.outlineStyle !== "none" || state.boxShadow !== "none",
        ),
      ).toEqual([]);
    });

    test("Style controls have no focus ring", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const focusVisualStates = await getOverlayFocusVisualStates(
        reactGrab.page,
        '[data-react-grab-input], [data-react-grab-edit-property], button, [role="slider"]',
      );
      expect(focusVisualStates.map((state) => state.label)).toContain("Search properties");
      expect(
        focusVisualStates.filter(
          (state) => state.outlineStyle !== "none" || state.boxShadow !== "none",
        ),
      ).toEqual([]);
    });

    test("hovering a style row keeps row height stable", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeRows = await getPropertyRowBounds(reactGrab.page);
      const targetRow = beforeRows.find((row) => !row.isActive);
      expect(targetRow).toBeTruthy();

      await reactGrab.page.mouse.move(
        targetRow!.left + targetRow!.width / 2,
        targetRow!.top + targetRow!.height / 2,
      );
      await expect.poll(() => getActivePropertyKey(reactGrab.page)).toBe(targetRow!.key);

      const afterRows = await getPropertyRowBounds(reactGrab.page);
      const afterTargetRow = afterRows.find((row) => row.key === targetRow!.key);
      expect(afterTargetRow).toBeTruthy();
      expect(Math.abs(afterTargetRow!.height - targetRow!.height)).toBeLessThan(0.5);
    });

    test("S opens Style from the context menu", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(BUTTON_SELECTOR);

      await reactGrab.page.keyboard.press("s");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(true);
    });

    test("Enter triggers Comment from the context menu", async ({ reactGrab }) => {
      await reactGrab.activate();
      await reactGrab.hoverElement(BUTTON_SELECTOR);
      await reactGrab.waitForSelectionBox();
      await reactGrab.rightClickElement(BUTTON_SELECTOR);

      await reactGrab.page.keyboard.press("Enter");
      await expect.poll(() => reactGrab.isPromptModeActive()).toBe(true);
    });
  });

  test.describe("Dismissal", () => {
    test("Escape dismisses the panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
    });

    test("Escape remains owned by the panel after a host input receives focus", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const focusedTestId = await reactGrab.page.evaluate(() => {
        const hostInput = document.querySelector<HTMLInputElement>("[data-testid='test-input']");
        hostInput?.focus();
        return document.activeElement?.getAttribute("data-testid") ?? null;
      });
      expect(focusedTestId).toBe("test-input");

      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
    });

    test("Escape opens discard prompt after host focus when tweaks are pending", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).not.toBe(beforeTweak);

      const focusedTestId = await reactGrab.page.evaluate(() => {
        const hostInput = document.querySelector<HTMLInputElement>("[data-testid='test-input']");
        hostInput?.focus();
        return document.activeElement?.getAttribute("data-testid") ?? null;
      });
      expect(focusedTestId).toBe("test-input");

      await openDiscardPromptViaEscape(reactGrab.page);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);
    });

    test("second Escape discards inline preview from the discard prompt", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);

      const duringTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(duringTweak.length).toBeGreaterThan(0);

      await openDiscardPromptViaEscape(reactGrab.page);
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

      await openDiscardPromptViaEscape(reactGrab.page);
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

      await openDiscardPromptViaEscape(reactGrab.page);
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

    test("second outside dismiss confirms discard prompt", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).not.toBe(beforeTweak);

      await dispatchOutsideDismiss(reactGrab.page);
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);

      await dispatchOutsideDismiss(reactGrab.page);
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).toBe(beforeTweak);
    });

    test("Escape in compact mode expands the panel before prompting to discard", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);

      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(false);

      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);
    });

    test("clicking outside in compact mode expands and prompts to discard directly", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);

      await dispatchOutsideDismiss(reactGrab.page);
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelVisible(reactGrab.page)).toBe(true);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);
    });

    test("net-zero tweak dismiss restores preview inline styles", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("px-2");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).not.toBe(beforeTweak);

      await dispatchOutsideDismiss(reactGrab.page);
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).toBe(beforeTweak);
    });

    test("toolbar menu dismiss restores preview inline styles", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).not.toBe(beforeTweak);

      await reactGrab.rightClickToolbarToggle();

      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).toBe(beforeTweak);
    });

    test("renderer disable dismiss restores preview inline styles", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).not.toBe(beforeTweak);

      await reactGrab.page.evaluate(() => {
        window.__REACT_GRAB__?.setEnabled(false);
      });

      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).toBe(beforeTweak);
    });

    test("held arrow repeat stops while discard prompt is visible", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.down("ArrowRight");
      await reactGrab.page.waitForTimeout(360);
      // A keyboard Escape from compact only expands; the held arrow would
      // re-collapse it. An outside click goes straight to the discard
      // prompt, which is what freezes the held-repeat value.
      await dispatchOutsideDismiss(reactGrab.page);
      await reactGrab.page.waitForTimeout(80);
      expect(await isDiscardPromptVisible(reactGrab.page)).toBe(true);
      const valueAtPrompt = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);

      await reactGrab.page.waitForTimeout(180);
      expect(await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR)).toBe(valueAtPrompt);
      await reactGrab.page.keyboard.up("ArrowRight");
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
    });
  });

  test.describe("Property listing", () => {
    test("non-uniform padding emits y/x aggregate rows (not all 4 sides)", async ({
      reactGrab,
    }) => {
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
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const keys = await getVisiblePropertyKeys(reactGrab.page);
      expect(keys.some((key) => key.startsWith("margin"))).toBe(false);

      await typeInSearchInput(reactGrab.page, "margin");
      await reactGrab.page.waitForTimeout(80);
      const searched = await getVisiblePropertyKeys(reactGrab.page);
      expect(searched.some((key) => key.startsWith("margin"))).toBe(true);
    });

    test("typing a search query reveals non-canonical properties", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const beforeSearch = await getVisiblePropertyKeys(reactGrab.page);
      expect(beforeSearch).not.toContain("padding-top");

      await typeInSearchInput(reactGrab.page, "padding");
      await reactGrab.page.waitForTimeout(80);
      const afterSearch = await getVisiblePropertyKeys(reactGrab.page);
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

    test("typing a partial Tailwind alias uses prefix search", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "font-mo");
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
      const valueBeforeIncrement = await getActivePropertyValue(reactGrab.page);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const valueAfterIncrement = await getActivePropertyValue(reactGrab.page);
      expect(valueAfterIncrement).not.toBe(valueBeforeIncrement);
    });

    test("ArrowLeft decrements the active property's displayed value", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const valueAfterIncrement = await getActivePropertyValue(reactGrab.page);
      await reactGrab.page.keyboard.press("ArrowLeft");
      await reactGrab.page.waitForTimeout(80);
      const valueAfterDecrement = await getActivePropertyValue(reactGrab.page);
      expect(valueAfterDecrement).not.toBe(valueAfterIncrement);
    });

    test("tweak applies an inline style on the target element", async ({ reactGrab }) => {
      const inlineStyleBeforeTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const inlineStyleAfterTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(inlineStyleAfterTweak.length).toBeGreaterThan(0);
      expect(inlineStyleAfterTweak).not.toBe(inlineStyleBeforeTweak);
    });

    test("idle numeric rows show slider fill without the handle caret", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "line height");
      await reactGrab.page.waitForTimeout(80);

      const activeSliderVisualState = await getActiveSliderVisualState(reactGrab.page);
      expect(activeSliderVisualState.key).toBe("line-height");
      expect(activeSliderVisualState.width ?? 0).toBeGreaterThan(0);
      expect(activeSliderVisualState.fillOpacity ?? 0).toBeGreaterThan(0);
      expect(activeSliderVisualState.handleOpacity).toBe(0);
    });

    test("hovering a numeric row shows slider unit marks and handle", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await typeInSearchInput(reactGrab.page, "line height");
      await reactGrab.page.waitForTimeout(80);

      const beforeHover = await getActiveSliderVisualState(reactGrab.page);
      expect(beforeHover.handleOpacity).toBe(0);
      expect(beforeHover.maxHashMarkOpacity).toBe(0);

      await reactGrab.page.evaluate(
        ({ attrName, propertyAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const activePropertyRow = shadowRoot?.querySelector<HTMLElement>(
            `[${propertyAttr}][aria-current="true"]`,
          );
          activePropertyRow?.querySelector<HTMLElement>("[role='slider']")?.scrollIntoView({
            block: "center",
            inline: "center",
          });
        },
        { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
      );

      const sliderBounds = await reactGrab.page.evaluate(
        ({ attrName, propertyAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const activePropertyRow = shadowRoot?.querySelector<HTMLElement>(
            `[${propertyAttr}][aria-current="true"]`,
          );
          const slider = activePropertyRow?.querySelector<HTMLElement>("[role='slider']");
          const sliderBounds = slider?.getBoundingClientRect();
          return sliderBounds
            ? {
                left: sliderBounds.left,
                top: sliderBounds.top,
                width: sliderBounds.width,
                height: sliderBounds.height,
              }
            : null;
        },
        { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
      );
      if (!sliderBounds) throw new Error("Active slider not found");

      await reactGrab.page.mouse.move(
        sliderBounds.left + sliderBounds.width / 2,
        sliderBounds.top + sliderBounds.height / 2,
      );
      await reactGrab.page.waitForTimeout(220);

      const afterHover = await getActiveSliderVisualState(reactGrab.page);
      expect(afterHover.handleOpacity ?? 0).toBeGreaterThan(0);
      expect(afterHover.maxHashMarkOpacity).toBeGreaterThan(0);
    });

    test("active highlight re-syncs its width when the panel resizes", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.waitForTimeout(200);

      const readHighlightFit = () =>
        reactGrab.page.evaluate(
          ({ attrName, propertyAttr }) => {
            const root = document.querySelector(`[${attrName}]`)?.shadowRoot;
            const activeRow = root?.querySelector<HTMLElement>(
              `[${propertyAttr}][aria-current="true"]`,
            );
            const highlight = activeRow
              ?.closest<HTMLElement>("[role='menu']")
              ?.querySelector<HTMLElement>("[aria-hidden='true']");
            if (!activeRow || !highlight) throw new Error("active row or highlight not found");
            return { rowWidth: activeRow.offsetWidth, highlightWidth: highlight.offsetWidth };
          },
          { attrName: ATTRIBUTE_NAME, propertyAttr: EDIT_PROPERTY_ATTR },
        );

      const initial = await readHighlightFit();
      expect(initial.highlightWidth).toBe(initial.rowWidth);

      await reactGrab.page.evaluate(
        ({ attrName, panelAttr }) => {
          const surface = document
            .querySelector(`[${attrName}]`)
            ?.shadowRoot?.querySelector<HTMLElement>(`[${panelAttr}] > div`);
          if (!surface) throw new Error("panel surface not found");
          surface.style.width = "300px";
        },
        { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
      );

      await expect
        .poll(async () => {
          const { rowWidth, highlightWidth } = await readHighlightFit();
          return rowWidth > 200 && highlightWidth === rowWidth;
        })
        .toBe(true);
    });

    test("hovering another row after slider adjustment updates the active property", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const activePropertyKeyBeforeHover = await getActivePropertyKey(reactGrab.page);

      await dragActiveSlider(reactGrab.page);
      const propertyRows = await getPropertyRowBounds(reactGrab.page);
      const hoverTargetRow = propertyRows.find(
        (propertyRow) => !propertyRow.isActive && propertyRow.width > 0 && propertyRow.height > 0,
      );
      if (!hoverTargetRow) throw new Error("Hover target row not found");

      await reactGrab.page.mouse.move(
        hoverTargetRow.left + hoverTargetRow.width / 2,
        hoverTargetRow.top + hoverTargetRow.height / 2,
      );

      await expect.poll(() => getActivePropertyKey(reactGrab.page)).toBe(hoverTargetRow.key);
      expect(await getActivePropertyKey(reactGrab.page)).not.toBe(activePropertyKeyBeforeHover);
    });

    test("discard prompt expands to full panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(220);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
    });

    test("Tailwind label appears to the left of the value", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.down("Shift");
      try {
        await reactGrab.page.waitForTimeout(80);

        const order = await getActiveTailwindLabelOrder(reactGrab.page);
        expect(order.tailwindLeft).not.toBeNull();
        expect(order.valueLeft).not.toBeNull();
        expect(order.tailwindLeft ?? 0).toBeLessThan(order.valueLeft ?? 0);
      } finally {
        await reactGrab.page.keyboard.up("Shift");
      }
    });

    test("ArrowUp / ArrowDown navigate the list, not the value", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const initialActivePropertyKey = await getActivePropertyKey(reactGrab.page);
      await reactGrab.page.keyboard.press("ArrowDown");
      await reactGrab.page.waitForTimeout(80);
      const activePropertyKeyAfterDown = await getActivePropertyKey(reactGrab.page);
      expect(activePropertyKeyAfterDown).not.toBe(initialActivePropertyKey);
    });

    test("Shift+ArrowRight steps by 10×", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const valueBeforeStep = await getActivePropertyValue(reactGrab.page);

      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const valueAfterOneStep = await getActivePropertyValue(reactGrab.page);

      await reactGrab.page.keyboard.down("Shift");
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.keyboard.up("Shift");
      await reactGrab.page.waitForTimeout(80);
      const valueAfterShiftStep = await getActivePropertyValue(reactGrab.page);

      const parseNumericDisplayValue = (text: string | null): number =>
        Number.parseFloat((text ?? "").replace(/[^\d.-]/g, "")) || 0;
      const oneStepDelta = Math.abs(
        parseNumericDisplayValue(valueAfterOneStep) - parseNumericDisplayValue(valueBeforeStep),
      );
      const shiftStepDelta = Math.abs(
        parseNumericDisplayValue(valueAfterShiftStep) - parseNumericDisplayValue(valueAfterOneStep),
      );
      expect(shiftStepDelta).toBeGreaterThan(oneStepDelta);
    });

    test("typing 'size' on a square element steps width and height together", async ({
      reactGrab,
    }) => {
      const squareSelector = "[data-testid='gradient-div']";
      await openEditPanel(reactGrab, squareSelector);
      await setSearchInputValue(reactGrab.page, "size");
      await expect.poll(() => getActivePropertyKey(reactGrab.page)).toBe("width,height");

      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const width = await getInlineStyleProperty(reactGrab.page, squareSelector, "width");
      const height = await getInlineStyleProperty(reactGrab.page, squareSelector, "height");
      expect(width).not.toBe("");
      expect(width).toBe(height);
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
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
    });

    test("compact slider shows unit marks on hover", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
      const beforeHover = await getVisibleSliderVisualState(reactGrab.page);
      expect(beforeHover.maxHashMarkOpacity).toBe(0);
      await hoverVisibleSlider(reactGrab.page);
      await reactGrab.page.waitForTimeout(IDLE_BUFFER_MS);
      const afterHover = await getVisibleSliderVisualState(reactGrab.page);
      expect(afterHover.maxHashMarkOpacity).toBeGreaterThan(0);
    });

    test("typing in search re-expands the compact panel", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(true);
      await reactGrab.page.keyboard.type("q");
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
    });

    test("compact inline numeric edit survives decimal drafts", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const activePropertyKey = await getActivePropertyKey(reactGrab.page);
      expect(activePropertyKey).toBe("padding-left,padding-right");

      await setSearchInputValue(reactGrab.page, "24");
      await reactGrab.page.waitForTimeout(80);
      await setSearchInputValue(reactGrab.page, "24.");
      await reactGrab.page.waitForTimeout(80);

      expect(await getEditPanelCompactAttr(reactGrab.page)).toBe("true");
      expect(await getActivePropertyKey(reactGrab.page)).toBe(activePropertyKey);

      await setSearchInputValue(reactGrab.page, "24.5");
      await reactGrab.page.waitForTimeout(80);

      expect(await getEditPanelCompactAttr(reactGrab.page)).toBe("true");
      expect(await getActivePropertyKey(reactGrab.page)).toBe(activePropertyKey);
      expect(await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-left")).toBe(
        "25px",
      );
      expect(await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-right")).toBe(
        "25px",
      );
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
      const compactAttrBeforeTyping = await reactGrab.page.evaluate(
        ({ attrName, panelAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
          return panel?.getAttribute("data-rg-compact") ?? null;
        },
        { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
      );
      expect(compactAttrBeforeTyping).toBe("false");
      await reactGrab.page.keyboard.type("mt");
      await reactGrab.page.waitForTimeout(80);
      const compactAttrAfterTyping = await reactGrab.page.evaluate(
        ({ attrName, panelAttr }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector(`[${panelAttr}]`);
          return panel?.getAttribute("data-rg-compact") ?? null;
        },
        { attrName: ATTRIBUTE_NAME, panelAttr: EDIT_PANEL_ATTR },
      );
      expect(compactAttrAfterTyping).toBe("true");
    });

    test("typing a complete tailwind class (mt-5) applies value + compact", async ({
      reactGrab,
    }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      const marginTopBeforeTyping = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "margin-top",
      );
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
      const marginTopAfterTyping = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "margin-top",
      );
      expect(marginTopAfterTyping).not.toBe(marginTopBeforeTyping);
      expect(marginTopAfterTyping).toContain("20");
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
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("p-4");
      await reactGrab.page.waitForTimeout(80);
      const paddingTop = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "padding-top",
      );
      const paddingRight = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "padding-right",
      );
      const paddingBottom = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "padding-bottom",
      );
      const paddingLeft = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "padding-left",
      );
      expect(paddingTop).toContain("16");
      expect(paddingRight).toContain("16");
      expect(paddingBottom).toContain("16");
      expect(paddingLeft).toContain("16");
    });

    test("typing multiple tailwind classes applies each token", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("p-4 mt-5");
      await reactGrab.page.waitForTimeout(80);

      expect(await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "padding-top")).toBe(
        "16px",
      );
      expect(await getInlineStyleProperty(reactGrab.page, BUTTON_SELECTOR, "margin-top")).toBe(
        "20px",
      );
      expect(await getEditPanelCompactAttr(reactGrab.page)).toBe("true");
    });

    test("typing border-t-4 writes only the top border width", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.type("border-t-4");
      await reactGrab.page.waitForTimeout(80);

      const borderTopWidth = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "border-top-width",
      );
      const borderRightWidth = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "border-right-width",
      );
      const borderBottomWidth = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "border-bottom-width",
      );
      const borderLeftWidth = await getInlineStyleProperty(
        reactGrab.page,
        BUTTON_SELECTOR,
        "border-left-width",
      );

      expect(borderTopWidth).toBe("4px");
      expect(borderRightWidth).toBe("");
      expect(borderBottomWidth).toBe("");
      expect(borderLeftWidth).toBe("");
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
      const firstDisplayedValue = await getActivePropertyValue(reactGrab.page);

      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const secondDisplayedValue = await getActivePropertyValue(reactGrab.page);
      expect(secondDisplayedValue).not.toBe(firstDisplayedValue);
    });
  });

  test.describe("Commit behavior", () => {
    test("Enter does not write to sessionStorage (in-memory only)", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      await reactGrab.page.keyboard.press("Enter");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const sessionStorageEntries = await readSessionStorageEntries(reactGrab.page);
      expect(Object.keys(sessionStorageEntries).length).toBe(0);
    });

    test("Escape does not write to sessionStorage (in-memory only)", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      // Escape from compact: expand, then prompt to discard, then confirm.
      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      await reactGrab.page.keyboard.press("Escape");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const sessionStorageEntries = await readSessionStorageEntries(reactGrab.page);
      expect(Object.keys(sessionStorageEntries).length).toBe(0);
    });

    test("inline styles persist on commit (not reverted)", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await reactGrab.page.keyboard.press("ArrowRight");
      await reactGrab.page.waitForTimeout(80);
      const inlineStyleAfterTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(inlineStyleAfterTweak.length).toBeGreaterThan(0);

      await reactGrab.page.keyboard.press("Enter");
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);
      await reactGrab.page.waitForTimeout(200);

      const afterCommit = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(afterCommit).toBe(inlineStyleAfterTweak);
    });

    test("header Copy button appears after a pending tweak and submits", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      expect(await isHeaderCopyButtonVisible(reactGrab.page)).toBe(false);

      await dragActiveSlider(reactGrab.page);
      await reactGrab.page.waitForTimeout(80);
      expect(await isEditPanelCompact(reactGrab.page)).toBe(false);
      expect(await isHeaderCopyButtonVisible(reactGrab.page)).toBe(true);

      const inlineStyleAfterTweak = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(inlineStyleAfterTweak.length).toBeGreaterThan(0);
      await clickHeaderCopyButton(reactGrab.page);
      await expect.poll(() => isEditPanelVisible(reactGrab.page)).toBe(false);

      const afterCommit = await getInlineStyleAttribute(reactGrab.page, BUTTON_SELECTOR);
      expect(afterCommit).toBe(inlineStyleAfterTweak);
    });

    test("header Copy button matches the neutral discard button style", async ({ reactGrab }) => {
      await openEditPanel(reactGrab, BUTTON_SELECTOR);
      await dragActiveSlider(reactGrab.page);
      await reactGrab.page.waitForTimeout(80);

      const copyButtonStyle = await getOverlayButtonVisualStyle(
        reactGrab.page,
        `[${COPY_BUTTON_ATTR}]`,
      );

      await reactGrab.page.keyboard.press("Escape");
      await reactGrab.page.waitForTimeout(80);
      const cancelButtonStyle = await getOverlayButtonVisualStyle(
        reactGrab.page,
        "[data-react-grab-discard-button='cancel']",
      );

      expect(copyButtonStyle).toEqual(cancelButtonStyle);
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
      const panelStateBeforeClick = await reactGrab.page.evaluate(
        ({ attrName }) => {
          const host = document.querySelector(`[${attrName}]`);
          const shadowRoot = host?.shadowRoot;
          const panel = shadowRoot?.querySelector("[data-react-grab-edit-panel]");
          return panel ? "panel-open" : "panel-gone";
        },
        { attrName: ATTRIBUTE_NAME },
      );
      expect(panelStateBeforeClick).toBe("panel-open");

      await reactGrab.page.locator(CARD_SELECTOR).first().click({ force: true });
      await reactGrab.page.waitForTimeout(150);

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
    test("registerCommentAction restores the Comment context menu item", async ({ reactGrab }) => {
      await reactGrab.page.evaluate(() => {
        window.__REACT_GRAB__?.unregisterPlugin("comment");
      });
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
