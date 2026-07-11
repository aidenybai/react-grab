import type { Page } from "@playwright/test";
import { expect, type ReactGrabPageObject } from "../fixtures.js";

export const isProductionProject = (projectName: string): boolean =>
  projectName.endsWith("-production");

export const isServerRenderedProject = (projectName: string): boolean =>
  projectName.includes("next") || projectName.includes("tanstack");

export const isNextProject = (projectName: string): boolean => projectName.includes("next");

export const isTanStackProject = (projectName: string): boolean => projectName.includes("tanstack");

export const waitForReactGrabReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => Boolean(window.__REACT_GRAB__));
};

export const copyFrameworkContext = async (
  reactGrab: ReactGrabPageObject,
  selector: string,
): Promise<string> => {
  const didCopy = await reactGrab.copyElementViaApi(selector);
  expect(didCopy).toBe(true);
  return reactGrab.getClipboardContent();
};

export const extractContextSelector = (context: string): string | null =>
  context.match(/selector: (.+?)(?: key: "[^"]+")?\]$/)?.[1] ?? null;

export const expectContextSelectorTargets = async (
  page: Page,
  context: string,
  selectedElementSelector: string,
): Promise<void> => {
  const contextSelector = extractContextSelector(context);
  expect(contextSelector).not.toBeNull();
  if (!contextSelector) return;

  const selectorResult = await page.evaluate(
    ({ contextSelectorValue, selectedElementSelectorValue }) => {
      const contextTargets = document.querySelectorAll(contextSelectorValue);
      const selectedElement = document.querySelector(selectedElementSelectorValue);
      const contextTarget = contextTargets.item(0);

      return {
        isSemanticTarget:
          contextTarget === selectedElement || Boolean(contextTarget?.contains(selectedElement)),
        matchCount: contextTargets.length,
      };
    },
    {
      contextSelectorValue: contextSelector,
      selectedElementSelectorValue: selectedElementSelector,
    },
  );

  expect(selectorResult.matchCount).toBe(1);
  expect(selectorResult.isSemanticTarget).toBe(true);
};

export const getExpectedFeatureSourcePattern = (projectName: string): RegExp => {
  if (isNextProject(projectName)) return /(?:app\/page|production-icon-link)\.tsx/;
  if (isTanStackProject(projectName)) return /routes\/index\.tsx/;
  return /(?:home-page|production-icon-link)\.tsx/;
};
