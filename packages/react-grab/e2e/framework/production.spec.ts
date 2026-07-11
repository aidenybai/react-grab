import { expect, test } from "../fixtures.js";
import {
  copyFrameworkContext,
  expectContextSelectorTargets,
  extractContextSelector,
  getExpectedFeatureSourcePattern,
  isProductionProject,
} from "./framework-helpers.js";

test.describe("production framework degradation", () => {
  test.beforeEach(({ page }, testInfo) => {
    void page;
    test.skip(
      !isProductionProject(testInfo.project.name),
      "Production invariants only apply to optimized builds",
    );
  });

  test("serves optimized assets without browser source maps", async ({ reactGrab }) => {
    const blockedMapRequests: string[] = [];
    const runtimeErrors: string[] = [];
    reactGrab.page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    reactGrab.page.on("pageerror", (error) => {
      runtimeErrors.push(error.message);
    });
    await reactGrab.page.route(/\.map(?:[?#]|$)/, async (route) => {
      blockedMapRequests.push(route.request().url());
      await route.abort();
    });
    await reactGrab.page.reload({ waitUntil: "domcontentloaded" });
    await expect(reactGrab.page.getByTestId("runtime-marker")).toContainText("production");

    const scriptUrls = await reactGrab.page
      .locator("script[src]")
      .evaluateAll((scripts) =>
        scripts.map((script) => script.getAttribute("src")).filter((source) => Boolean(source)),
      );
    expect(scriptUrls.length).toBeGreaterThan(0);

    for (const scriptSource of scriptUrls) {
      if (!scriptSource) continue;
      const scriptUrl = new URL(scriptSource, reactGrab.page.url()).href;
      const scriptResponse = await reactGrab.page.context().request.get(scriptUrl);
      const scriptBody = await scriptResponse.text();
      expect(scriptResponse.ok()).toBe(true);
      expect(scriptBody).not.toMatch(/\/\/[#@]\s*sourceMappingURL=|\/\*[#@]\s*sourceMappingURL=/);

      const sourceMapResponse = await reactGrab.page.context().request.get(`${scriptUrl}.map`);
      if (sourceMapResponse.ok()) {
        expect(await sourceMapResponse.text()).not.toMatch(/"sources"\s*:/);
      }
    }

    expect(blockedMapRequests).toEqual([]);
    expect(runtimeErrors).toEqual([]);
  });

  test("keeps nested SVG content actionable with maps unavailable", async ({
    reactGrab,
  }, testInfo) => {
    const selectedElementSelector = '[data-testid="production-icon-link"] path';
    const context = await copyFrameworkContext(reactGrab, selectedElementSelector);
    const hasFeatureSource = getExpectedFeatureSourcePattern(testInfo.project.name).test(context);

    expect(context).toContain("<path");
    expect(context).not.toContain('key: "c"');
    if (!hasFeatureSource) {
      await expectContextSelectorTargets(reactGrab.page, context, selectedElementSelector);
    }
  });

  test("emits a valid unique selector for generated client ownership", async ({ reactGrab }) => {
    const selectedElementSelector = '[data-testid="selector-special-target"]';
    const context = await copyFrameworkContext(reactGrab, selectedElementSelector);

    expect(extractContextSelector(context)).not.toBeNull();
    await expectContextSelectorTargets(reactGrab.page, context, selectedElementSelector);
    expect(context).not.toContain('key: "c"');
  });
});
