import { expect, test } from "@playwright/test";
import { expectVisibleFocusRing, getStyleProperty } from "./style-helpers";

test.describe("Benchmark Table Hover & Focus States", () => {
  test("filter input and sort controls preserve interactive states", async ({
    page,
  }) => {
    await page.goto("/blog/intro");

    const filterInput = page.getByPlaceholder("Filter tests...");
    await filterInput.scrollIntoViewIfNeeded();
    await expect(filterInput).toBeVisible({ timeout: 45_000 });
    await expectVisibleFocusRing(filterInput);

    const inputTokensSortButton = page.getByRole("button", {
      name: /input tokens/i,
    });
    await expect(inputTokensSortButton).toBeVisible();

    const sortButtonColorBeforeHover = await getStyleProperty(
      inputTokensSortButton,
      "color",
    );
    await inputTokensSortButton.hover();
    const sortButtonColorAfterHover = await getStyleProperty(
      inputTokensSortButton,
      "color",
    );
    expect(sortButtonColorAfterHover).not.toBe(sortButtonColorBeforeHover);

    await expectVisibleFocusRing(inputTokensSortButton);
  });
});
