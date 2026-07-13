import { test, expect } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";
import type { Page } from "@playwright/test";

interface SelectionSessionBarState {
  isVisible: boolean;
  multiSelectEnabled: boolean;
  selectedText: string | null;
  copyDisabled: boolean | null;
}

const getSelectionSessionBarState = async (page: Page): Promise<SelectionSessionBarState> => {
  return page.evaluate((attributeName: string) => {
    const host = document.querySelector(`[${attributeName}]`);
    const root = host?.shadowRoot?.querySelector(`[${attributeName}]`);
    const bar = root?.querySelector<HTMLElement>("[data-react-grab-selection-session-bar]");
    const multiSelectButton = bar?.querySelector(
      "[data-react-grab-selection-session-enable-multi-select]",
    );
    const selectedText = bar?.querySelector<HTMLElement>(".tabular-nums")?.textContent ?? null;
    const copyButton = bar?.querySelector<HTMLButtonElement>(
      "[data-react-grab-selection-session-copy]",
    );

    return {
      isVisible: Boolean(bar),
      multiSelectEnabled: !multiSelectButton,
      selectedText,
      copyDisabled: copyButton?.disabled ?? null,
    };
  }, ATTRIBUTE_NAME);
};

test.describe("Selection session bar", () => {
  test("should opt into persistent multi-select and copy the accumulated selection", async ({
    reactGrab,
  }) => {
    await reactGrab.activate();

    await expect
      .poll(() => getSelectionSessionBarState(reactGrab.page))
      .toMatchObject({
        isVisible: true,
        multiSelectEnabled: false,
      });
    await reactGrab.page.evaluate((attributeName) => {
      const host = document.querySelector(`[${attributeName}]`);
      const root = host?.shadowRoot?.querySelector(`[${attributeName}]`);
      root
        ?.querySelector<HTMLButtonElement>(
          "[data-react-grab-selection-session-enable-multi-select]",
        )
        ?.click();
    }, ATTRIBUTE_NAME);

    const todoItems = reactGrab.page.locator("[data-testid='todo-list'] li");
    await todoItems.nth(0).click({ force: true });
    await todoItems.nth(1).click({ force: true });

    await expect
      .poll(() => getSelectionSessionBarState(reactGrab.page))
      .toMatchObject({
        isVisible: true,
        multiSelectEnabled: true,
        selectedText: "2 selected",
        copyDisabled: false,
      });

    await reactGrab.page.evaluate((attributeName) => {
      const host = document.querySelector(`[${attributeName}]`);
      const root = host?.shadowRoot?.querySelector(`[${attributeName}]`);
      root?.querySelector<HTMLButtonElement>("[data-react-grab-selection-session-copy]")?.click();
    }, ATTRIBUTE_NAME);

    await expect.poll(() => reactGrab.getClipboardContent()).toContain("TodoItem");
  });
});
