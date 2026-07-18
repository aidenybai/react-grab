import { expect, test, type ReactGrabPageObject } from "./fixtures.js";

const copyProductionContext = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<string> => {
  const didCopy = await reactGrab.copyElementViaApi(selector);
  expect(didCopy).toBe(true);
  return reactGrab.getClipboardContent();
};

const FEATURE_SOURCE_PATTERN = /owner-stack-cases\.tsx/;
const PAGE_TARGET_SELECTOR = "[data-testid='main-title']";
const PAGE_TARGET_SOURCE_PATTERN = /App\.tsx/;

const expectActionableContext = (context: string, expectedFeatureSourcePattern: RegExp): void => {
  const hasFeatureSource = expectedFeatureSourcePattern.test(context);
  const hasSelector = context.includes("selector:");

  expect(hasFeatureSource || hasSelector).toBe(true);
  expect(context).not.toContain('key: "c"');
};

test.describe("framework production owner-stack degradation", () => {
  test("keeps a nested SVG path actionable without browser source maps", async ({ reactGrab }) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] path",
    );

    expect(context).toContain("<path");
    expectActionableContext(context, FEATURE_SOURCE_PATTERN);
    if (!FEATURE_SOURCE_PATTERN.test(context)) {
      expect(context).toContain('selector: [data-testid="production-icon-link"]');
    }
  });

  test("keeps an intermediate SVG group actionable", async ({ reactGrab }) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] g",
    );

    expect(context).toContain("<g");
    expectActionableContext(context, FEATURE_SOURCE_PATTERN);
  });

  test("keeps the SVG root actionable", async ({ reactGrab }) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] svg",
    );

    expectActionableContext(context, FEATURE_SOURCE_PATTERN);
  });

  test("keeps the semantic link actionable", async ({ reactGrab }) => {
    const context = await copyProductionContext(reactGrab, "[data-testid='production-icon-link']");

    expect(context).toContain('aria-label="Production GitHub link"');
    expectActionableContext(context, FEATURE_SOURCE_PATTERN);
  });

  test("keeps a page-owned host element actionable", async ({ reactGrab }) => {
    const context = await copyProductionContext(reactGrab, PAGE_TARGET_SELECTOR);

    expectActionableContext(context, PAGE_TARGET_SOURCE_PATTERN);
  });

  test("does not surface a key from a single keyed child", async ({ reactGrab }) => {
    const context = await copyProductionContext(reactGrab, "[data-testid='single-key-target']");

    expect(context).not.toContain('key: "only"');
    expect(context).not.toContain('key: "c"');
  });

  test("never replaces a real list key with a framework key", async ({ reactGrab }) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='list-key-target-second']",
    );

    expect(context).not.toContain('key: "c"');
    if (context.includes("key:")) {
      expect(context).toContain('key: "second"');
    }
  });

  test("does not let a shared-UI provider suppress the selector fallback", async ({
    reactGrab,
  }) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] path",
    );
    const hasSharedUiSource =
      context.includes("components/ui/production-provider.tsx") ||
      context.includes("components/ui/framework-provider.tsx");
    const hasFeatureSource = FEATURE_SOURCE_PATTERN.test(context);

    if (hasSharedUiSource && !hasFeatureSource) {
      expect(context).toContain("selector:");
    }
  });
});
