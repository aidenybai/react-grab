import { expect, test } from "../fixtures.js";
import {
  copyFrameworkContext,
  isProductionProject,
  isServerRenderedProject,
} from "./framework-helpers.js";

const REQUIRED_TARGETS = [
  "page-title",
  "runtime-marker",
  "grab-smoke-target",
  "production-icon-link",
  "single-key-target",
  "list-key-target-second",
  "numeric-key-target",
  "punctuated-key-target",
  "nested-key-target",
  "fragment-key-target",
  "reorder-key-target",
  "hydration-counter",
  "passed-child-target",
  "cloned-target",
  "portal-target",
  "keyed-remount-target",
  "selector-special-target",
  "error-trigger",
  "detail-route-link",
];

test.describe("shared framework contract", () => {
  test("exposes the complete fixture surface", async ({ reactGrab }) => {
    for (const testId of REQUIRED_TARGETS) {
      await expect(reactGrab.page.getByTestId(testId)).toHaveCount(1);
    }
  });

  test("reports the framework runtime mode", async ({ reactGrab }, testInfo) => {
    const expectedRuntime = isProductionProject(testInfo.project.name)
      ? "production"
      : "development";

    await expect(reactGrab.page.getByTestId("runtime-marker")).toContainText(expectedRuntime);
  });

  test("copies the shared smoke target", async ({ reactGrab }) => {
    const context = await copyFrameworkContext(reactGrab, '[data-testid="grab-smoke-target"]');

    expect(context).toMatch(/smoke target/i);
    expect(context).not.toContain('key: "c"');
  });

  test("server-rendered fixtures survive hydration", async ({ reactGrab, request }, testInfo) => {
    test.skip(
      !isServerRenderedProject(testInfo.project.name),
      "Stock Vite intentionally renders on the client",
    );

    const response = await request.get("/");
    const serverHtml = await response.text();

    expect(response.ok()).toBe(true);
    expect(serverHtml).toContain('data-testid="runtime-marker"');
    expect(serverHtml).toContain('data-testid="grab-smoke-target"');

    const counter = reactGrab.page.getByTestId("hydration-counter");
    const initialCounterText = await counter.textContent();
    await reactGrab.page.getByTestId("hydration-counter-button").click();
    await expect(counter).not.toHaveText(initialCounterText ?? "");
    await expect(counter).toContainText("1");
  });

  test("client-rendered state remains interactive", async ({ reactGrab }) => {
    const counter = reactGrab.page.getByTestId("hydration-counter");
    const initialCounterText = await counter.textContent();

    await expect(reactGrab.page.getByTestId("portal-target")).toHaveCount(1);
    await reactGrab.page.getByTestId("hydration-counter-button").click();

    await expect(counter).not.toHaveText(initialCounterText ?? "");
    await expect(counter).toContainText("1");
  });
});
