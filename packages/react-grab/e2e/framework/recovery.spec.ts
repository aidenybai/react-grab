import { expect, test } from "../fixtures.js";
import {
  copyFrameworkContext,
  isNextProject,
  isTanStackProject,
  waitForReactGrabReady,
} from "./framework-helpers.js";

test.describe("framework recovery boundaries", () => {
  test("recovers React Grab after a caught render error", async ({ reactGrab }) => {
    await reactGrab.page.getByTestId("error-trigger").click();
    await expect(reactGrab.page.getByTestId("error-fallback")).toBeVisible();

    const fallbackContext = await copyFrameworkContext(reactGrab, '[data-testid="error-fallback"]');
    expect(fallbackContext).toContain("error");

    await reactGrab.page.getByTestId("error-reset").click();
    await expect(reactGrab.page.getByTestId("error-trigger")).toBeVisible();

    const smokeContext = await copyFrameworkContext(reactGrab, '[data-testid="grab-smoke-target"]');
    expect(smokeContext).toMatch(/smoke target/i);
  });

  test("handles nested and streamed React Server Component owners", async ({
    reactGrab,
    request,
  }, testInfo) => {
    test.skip(!isNextProject(testInfo.project.name), "This fixture uses Next.js RSC");

    const serverResponse = await request.get("/");
    const serverHtml = await serverResponse.text();
    expect(serverHtml).toContain('data-testid="nested-rsc-target"');
    expect(serverHtml).toContain('data-testid="streamed-server-target"');

    await expect(reactGrab.page.getByTestId("streamed-server-target")).toBeVisible();
    const nestedContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="nested-rsc-client-target"]',
    );
    const streamedContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="streamed-server-target"]',
    );

    expect(nestedContext).not.toContain('key: "c"');
    expect(streamedContext).not.toContain('key: "c"');
  });

  test("revalidates a TanStack server loader", async ({ reactGrab }, testInfo) => {
    test.skip(
      !isTanStackProject(testInfo.project.name),
      "This fixture uses TanStack Start loader invalidation",
    );

    await reactGrab.page.getByTestId("detail-route-link").click();
    await expect(reactGrab.page.getByTestId("route-detail-target")).toBeVisible();

    const loaderTarget = reactGrab.page.getByTestId("route-detail-loader-target");
    const initialLoaderText = await loaderTarget.textContent();
    await reactGrab.page.getByTestId("route-detail-revalidate").click();
    await expect(loaderTarget).not.toHaveText(initialLoaderText ?? "");
  });

  test("recovers from a TanStack route loader error", async ({ reactGrab }, testInfo) => {
    test.skip(
      !isTanStackProject(testInfo.project.name),
      "This fixture uses a TanStack Start route error component",
    );

    await reactGrab.page.goto("/fixture-error", { waitUntil: "domcontentloaded" });
    await waitForReactGrabReady(reactGrab.page);
    await expect(reactGrab.page.getByTestId("fixture-error-fallback")).toBeVisible();
    await reactGrab.page.getByTestId("fixture-error-recovery-link").click();
    await expect(reactGrab.page.getByTestId("page-title")).toBeVisible();
    await waitForReactGrabReady(reactGrab.page);

    const context = await copyFrameworkContext(reactGrab, '[data-testid="grab-smoke-target"]');
    expect(context).toMatch(/smoke target/i);
  });
});
