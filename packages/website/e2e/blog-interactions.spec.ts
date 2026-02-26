import { expect, test } from "@playwright/test";
import { expectVisibleFocusRing, getStyleProperty } from "./style-helpers";

test.describe("Blog Hover & Focus States", () => {
  test("blog index post links keep hover and focus styles", async ({ page }) => {
    await page.goto("/blog");

    const introPostLink = page.getByRole("link", {
      name: /React Grab Is Now 1.0/i,
    });
    await expect(introPostLink).toBeVisible();

    const postTitleText = introPostLink.getByText("React Grab Is Now 1.0");
    const titleColorBeforeHover = await getStyleProperty(
      postTitleText,
      "color",
    );
    await introPostLink.hover();
    const titleColorAfterHover = await getStyleProperty(
      postTitleText,
      "color",
    );

    expect(titleColorAfterHover).not.toBe(titleColorBeforeHover);
    await expectVisibleFocusRing(introPostLink);
  });

  test("agent blog copy button and back link keep focus styles", async ({
    page,
  }) => {
    await page.goto("/blog/agent");

    const backToHomeLink = page.getByRole("link", { name: /Back to home/i });
    await expect(backToHomeLink).toBeVisible();
    await expectVisibleFocusRing(backToHomeLink);

    const copyButton = page.getByRole("button", { name: "Copy" }).first();
    await expect(copyButton).toBeVisible();
    await expectVisibleFocusRing(copyButton);
  });
});
