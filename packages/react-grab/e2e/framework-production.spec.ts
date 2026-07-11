import { expect, test, type ReactGrabPageObject } from "./fixtures.js";

const copyProductionContext = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<string> => {
  const didCopy = await reactGrab.copyElementViaApi(selector);
  expect(didCopy).toBe(true);
  return reactGrab.getClipboardContent();
};

const getFeatureSourcePattern = (projectName: string): RegExp => {
  if (projectName.includes("next")) return /production-icon-link\.tsx/;
  if (projectName.includes("tanstack")) return /routes\/index\.tsx/;
  return /owner-stack-cases\.tsx/;
};

const getPageTarget = (projectName: string): { selector: string; sourcePattern: RegExp } => {
  if (projectName.includes("next")) {
    return { selector: "[data-testid='page-title']", sourcePattern: /app\/page\.tsx/ };
  }
  if (projectName.includes("tanstack")) {
    return { selector: "[data-testid='page-title']", sourcePattern: /routes\/index\.tsx/ };
  }
  return { selector: "[data-testid='main-title']", sourcePattern: /App\.tsx/ };
};

const expectActionableContext = (context: string, expectedFeatureSourcePattern: RegExp): void => {
  const hasFeatureSource = expectedFeatureSourcePattern.test(context);
  const hasSelector = context.includes("selector:");

  expect(hasFeatureSource || hasSelector).toBe(true);
  expect(context).not.toContain('key: "c"');
};

test.describe("framework production owner-stack degradation", () => {
  test("keeps a nested SVG path actionable without browser source maps", async ({
    reactGrab,
  }, testInfo) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] path",
    );

    expect(context).toContain("<path");
    expectActionableContext(context, getFeatureSourcePattern(testInfo.project.name));
    if (!getFeatureSourcePattern(testInfo.project.name).test(context)) {
      expect(context).toContain('selector: [data-testid="production-icon-link"]');
    }
  });

  test("keeps an intermediate SVG group actionable", async ({ reactGrab }, testInfo) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] g",
    );

    expect(context).toContain("<g");
    expectActionableContext(context, getFeatureSourcePattern(testInfo.project.name));
  });

  test("keeps the SVG root actionable", async ({ reactGrab }, testInfo) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] svg",
    );

    expectActionableContext(context, getFeatureSourcePattern(testInfo.project.name));
  });

  test("keeps the semantic link actionable", async ({ reactGrab }, testInfo) => {
    const context = await copyProductionContext(reactGrab, "[data-testid='production-icon-link']");

    expect(context).toContain('aria-label="Production GitHub link"');
    expectActionableContext(context, getFeatureSourcePattern(testInfo.project.name));
  });

  test("keeps a page-owned host element actionable", async ({ reactGrab }, testInfo) => {
    const pageTarget = getPageTarget(testInfo.project.name);
    const context = await copyProductionContext(reactGrab, pageTarget.selector);

    expectActionableContext(context, pageTarget.sourcePattern);
  });

  test("keeps an SSR-owned child actionable", async ({ reactGrab }, testInfo) => {
    const projectName = testInfo.project.name;
    test.skip(projectName.includes("vite"), "The Vite fixture is client-rendered");

    const selector = projectName.includes("next")
      ? "[data-testid='server-card-body']"
      : "[data-testid='server-loader-target']";
    const sourcePattern = projectName.includes("next") ? /server-card\.tsx/ : /routes\/index\.tsx/;
    const context = await copyProductionContext(reactGrab, selector);

    expectActionableContext(context, sourcePattern);
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
  }, testInfo) => {
    const context = await copyProductionContext(
      reactGrab,
      "[data-testid='production-icon-link'] path",
    );
    const hasSharedUiSource =
      context.includes("components/ui/production-provider.tsx") ||
      context.includes("components/ui/framework-provider.tsx");
    const hasFeatureSource = getFeatureSourcePattern(testInfo.project.name).test(context);

    if (hasSharedUiSource && !hasFeatureSource) {
      expect(context).toContain("selector:");
    }
  });
});
