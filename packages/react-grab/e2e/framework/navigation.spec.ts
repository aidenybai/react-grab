import { expect, test } from "../fixtures.js";
import { copyFrameworkContext } from "./framework-helpers.js";

test.describe("shared framework navigation", () => {
  test("invalidates element context across route transitions and history", async ({
    reactGrab,
  }) => {
    const homeContext = await copyFrameworkContext(reactGrab, '[data-testid="page-title"]');

    await reactGrab.page.getByTestId("detail-route-link").click();
    await expect(reactGrab.page).toHaveURL(/\/detail/);
    await expect(reactGrab.page.getByTestId("route-detail-target")).toBeVisible();

    const detailContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="route-detail-target"]',
    );
    expect(detailContext).not.toBe(homeContext);
    expect(detailContext).toContain("detail");

    await reactGrab.page.goBack();
    await expect(reactGrab.page).toHaveURL(/\/$/);
    await expect(reactGrab.page.getByTestId("page-title")).toBeVisible();

    await reactGrab.page.goForward();
    await expect(reactGrab.page.getByTestId("route-detail-target")).toBeVisible();
    await reactGrab.page.getByTestId("detail-back-link").click();
    await expect(reactGrab.page.getByTestId("page-title")).toBeVisible();

    const restoredHomeContext = await copyFrameworkContext(reactGrab, '[data-testid="page-title"]');
    expect(restoredHomeContext).toContain("React Grab");
  });
});
