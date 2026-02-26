import { expect, test } from "@playwright/test";
import { expectVisibleFocusRing, getStyleProperty } from "./style-helpers";

test.describe("Open File Page Hover & Focus States", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/open-file?url=src/components/button.tsx&line=23");
  });

  test("editor dropdown and open controls keep hover and focus styles", async ({
    page,
  }) => {
    const editorDropdownTrigger = page.getByRole("button", {
      name: /cursor/i,
    });
    const openButton = page.getByRole("button", { name: "Open", exact: true });

    await expect(editorDropdownTrigger).toBeVisible();
    await expect(openButton).toBeVisible();

    const openButtonBackgroundBeforeHover = await getStyleProperty(
      openButton,
      "background-color",
    );
    await openButton.hover();
    const openButtonBackgroundAfterHover = await getStyleProperty(
      openButton,
      "background-color",
    );
    expect(openButtonBackgroundAfterHover).not.toBe(
      openButtonBackgroundBeforeHover,
    );

    await expectVisibleFocusRing(editorDropdownTrigger);
    await expectVisibleFocusRing(openButton);
  });

  test("editor menu options are keyboard focusable and selectable", async ({
    page,
  }) => {
    const editorDropdownTrigger = page.getByRole("button", {
      name: /cursor/i,
    });
    await editorDropdownTrigger.click();

    const vsCodeOption = page.getByRole("menuitem", { name: /vs code/i });
    await expect(vsCodeOption).toBeVisible();
    const optionBackgroundBeforeFocus = await getStyleProperty(
      vsCodeOption,
      "background-color",
    );
    await vsCodeOption.focus();
    const optionBackgroundAfterFocus = await getStyleProperty(
      vsCodeOption,
      "background-color",
    );
    expect(optionBackgroundAfterFocus).not.toBe(optionBackgroundBeforeFocus);
    await vsCodeOption.click();

    await expect(
      page.getByRole("button", {
        name: /vs code/i,
      }),
    ).toBeVisible();
  });

  test("info toggle preserves focus style", async ({ page }) => {
    const infoToggle = page.getByRole("button", { name: /what is react grab/i });
    await expect(infoToggle).toBeVisible();

    await expectVisibleFocusRing(infoToggle);
    await infoToggle.click();

    await expect(page.getByRole("link", { name: "Learn more" })).toBeVisible();
  });
});
