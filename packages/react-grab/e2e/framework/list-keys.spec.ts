import { expect, test } from "../fixtures.js";
import {
  copyFrameworkContext,
  isProductionProject,
  isTanStackProject,
} from "./framework-helpers.js";

const extractKey = (context: string): string | null => context.match(/key: "([^"]+)"/)?.[1] ?? null;

const expectKeyContext = (
  context: string,
  expectedKeyPattern: RegExp,
  canOmitKey: boolean,
): void => {
  expect(context).not.toContain('key: "c"');
  if (!canOmitKey || context.includes("key:")) {
    expect(context).toMatch(expectedKeyPattern);
  }
};

test.describe("shared list key semantics", () => {
  test("ignores a key without a keyed sibling", async ({ reactGrab }) => {
    const context = await copyFrameworkContext(reactGrab, '[data-testid="single-key-target"]');

    expect(context).not.toContain('key: "only"');
    expect(context).not.toContain('key: "c"');
  });

  test("surfaces string, numeric, punctuated, and nested keys", async ({ reactGrab }, testInfo) => {
    const stringContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="list-key-target-second"]',
    );
    const numericContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="numeric-key-target"]',
    );
    const punctuatedContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="punctuated-key-target"]',
    );
    const nestedContext = await copyFrameworkContext(
      reactGrab,
      '[data-testid="nested-key-target"]',
    );

    const canOmitKeys =
      isProductionProject(testInfo.project.name) || isTanStackProject(testInfo.project.name);
    expectKeyContext(stringContext, /key: "second"/, canOmitKeys);
    expectKeyContext(numericContext, /key: "\d+"/, canOmitKeys);
    expectKeyContext(punctuatedContext, /key: "item:two\/✓"/, canOmitKeys);
    expectKeyContext(nestedContext, /key: "nested-second"/, canOmitKeys);
  });

  test("keeps the selected key stable through reorder", async ({ reactGrab }, testInfo) => {
    const targetSelector = '[data-testid="reorder-key-target"]';
    const contextBeforeReorder = await copyFrameworkContext(reactGrab, targetSelector);
    const keyBeforeReorder = extractKey(contextBeforeReorder);

    await reactGrab.page.getByTestId("reorder-list-button").click();
    const contextAfterReorder = await copyFrameworkContext(reactGrab, targetSelector);

    if (!isProductionProject(testInfo.project.name) && !isTanStackProject(testInfo.project.name)) {
      expect(keyBeforeReorder).not.toBeNull();
    }
    const keyAfterReorder = extractKey(contextAfterReorder);
    const expectedReorderKey = testInfo.project.name.includes("next") ? "stable-target" : "target";
    if (keyBeforeReorder) expect(keyBeforeReorder).toBe(expectedReorderKey);
    if (keyAfterReorder) expect(keyAfterReorder).toBe(expectedReorderKey);
    expect(contextAfterReorder).not.toContain('key: "c"');
  });
});
