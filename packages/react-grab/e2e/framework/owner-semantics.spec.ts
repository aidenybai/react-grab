import { expect, test } from "../fixtures.js";
import { copyFrameworkContext, isProductionProject } from "./framework-helpers.js";

const getOwnerSourcePattern = (projectName: string, targetName: string): RegExp => {
  if (projectName.includes("next")) {
    if (targetName === "passed-child-target") return /app\/page\.tsx/;
    if (targetName === "cloned-target") return /clone-element-fixture\.tsx/;
    if (targetName === "portal-target") return /portal-fixture\.tsx/;
    if (targetName === "keyed-remount-target") return /keyed-remount-fixture\.tsx/;
    return /client-suspense-fixture\.tsx/;
  }
  if (projectName.includes("tanstack")) return /home-fixtures\.tsx/;
  return /(?:owner-cases|state-cases|suspense-section)\.tsx/;
};

const expectOwnerContext = (context: string, projectName: string, targetName: string): void => {
  expect(context).not.toContain('key: "c"');
  const hasGeneratedBundleSource = /(?:\/assets\/|\/_next\/static\/).+\.js/.test(context);
  if (hasGeneratedBundleSource) {
    expect(context).toContain("selector:");
  }

  const hasExpectedOwnerSource = getOwnerSourcePattern(projectName, targetName).test(context);
  const hasActionableSelector = context.includes("selector:");
  expect(hasExpectedOwnerSource || hasActionableSelector).toBe(true);
  if (!isProductionProject(projectName) && !projectName.includes("tanstack")) {
    expect(hasExpectedOwnerSource).toBe(true);
  }
};

test.describe("shared owner semantics", () => {
  for (const targetName of ["passed-child-target", "cloned-target", "portal-target"]) {
    test(`preserves the React owner for ${targetName}`, async ({ reactGrab }, testInfo) => {
      await expect(reactGrab.page.getByTestId(targetName)).toBeVisible();
      const context = await copyFrameworkContext(reactGrab, `[data-testid="${targetName}"]`);

      expectOwnerContext(context, testInfo.project.name, targetName);
    });
  }

  test("preserves ownership after a keyed remount", async ({ reactGrab }, testInfo) => {
    const targetSelector = '[data-testid="keyed-remount-target"]';
    const contextBeforeRemount = await copyFrameworkContext(reactGrab, targetSelector);

    await reactGrab.page.getByTestId("keyed-remount-trigger").click();
    const contextAfterRemount = await copyFrameworkContext(reactGrab, targetSelector);

    expectOwnerContext(contextBeforeRemount, testInfo.project.name, "keyed-remount-target");
    expectOwnerContext(contextAfterRemount, testInfo.project.name, "keyed-remount-target");
  });

  test("resolves a target after a real Suspense reveal", async ({ reactGrab }, testInfo) => {
    await reactGrab.page.getByTestId("suspense-trigger").click();
    await expect(reactGrab.page.getByTestId("suspense-fallback")).toBeVisible();
    await expect(reactGrab.page.getByTestId("suspense-revealed-target")).toBeVisible();

    const context = await copyFrameworkContext(
      reactGrab,
      '[data-testid="suspense-revealed-target"]',
    );

    expectOwnerContext(context, testInfo.project.name, "suspense-revealed-target");
  });
});
