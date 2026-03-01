import { expect, test } from "@playwright/test";
import { expectVisibleFocusRing, getStyleProperty } from "./style-helpers";

test.describe("Homepage Hover & Focus States", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("stream-completed", "true");
    });
    await page.goto("/");
  });

  test("primary CTA controls keep hover and focus styles", async ({ page }) => {
    const githubCta = page.getByRole("link", { name: "Star on GitHub" });
    await expect(githubCta).toBeVisible();

    const githubBackgroundBeforeHover = await getStyleProperty(
      githubCta,
      "background-color",
    );
    await githubCta.hover();
    const githubBackgroundAfterHover = await getStyleProperty(
      githubCta,
      "background-color",
    );

    expect(githubBackgroundAfterHover).not.toBe(githubBackgroundBeforeHover);
    await expectVisibleFocusRing(githubCta);

    const holdHotkeyButton = page.getByRole("button", { name: /hold/i });
    await expect(holdHotkeyButton).toBeVisible();
    await expectVisibleFocusRing(holdHotkeyButton);
  });

  test("install tabs keep interactive states", async ({ page }) => {
    const cliTabTrigger = page.getByRole("tab", { name: "CLI" });
    const manualInstallTabTrigger = page.getByRole("tab", {
      name: "Next.js (App)",
    });

    await expect(cliTabTrigger).toBeVisible();
    await expect(manualInstallTabTrigger).toBeVisible();

    const tabColorBeforeHover = await getStyleProperty(
      manualInstallTabTrigger,
      "color",
    );
    await manualInstallTabTrigger.hover();
    const tabColorAfterHover = await getStyleProperty(
      manualInstallTabTrigger,
      "color",
    );
    expect(tabColorAfterHover).not.toBe(tabColorBeforeHover);

    await expectVisibleFocusRing(manualInstallTabTrigger);
  });
});
