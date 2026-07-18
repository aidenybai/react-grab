import { expect, test } from "./fixtures.js";
import { ATTRIBUTE_NAME } from "./constants.js";
import { isProductionProject } from "./framework/framework-helpers.js";
import { SOLID_SOURCE_LOCATION_ATTRIBUTE } from "../src/utils/resolve-solid-source-location.js";

const TOOLBAR_ACTION_SELECTOR = "[data-react-grab-toolbar-action]";
const TOOLBAR_ACTION_SOURCE_PATH =
  "packages/react-grab/src/components/toolbar/toolbar-action-button.tsx";
const TOOLBAR_ACTION_SOURCE_LINE_NUMBER = 24;
const TOOLBAR_ACTION_SOURCE_COLUMN_NUMBER = 5;

test("exposes exact Solid sources only in development", async ({ reactGrab }, testInfo) => {
  await reactGrab.activate();
  await expect(reactGrab.getOverlayHost().locator(TOOLBAR_ACTION_SELECTOR).first()).toBeAttached();

  const sourceResult = await reactGrab.page.evaluate(
    async ({ overlayAttribute, sourceLocationAttribute, toolbarActionSelector }) => {
      const overlayHost = document.querySelector(`[${overlayAttribute}]`);
      const actionButton = overlayHost?.shadowRoot?.querySelector(toolbarActionSelector);
      const source = actionButton ? await window.__REACT_GRAB__?.getSource(actionButton) : null;

      return {
        filePath: source?.filePath ?? null,
        lineNumber: source?.lineNumber ?? null,
        columnNumber: source?.columnNumber ?? null,
        sourceLocation: actionButton?.getAttribute(sourceLocationAttribute) ?? null,
      };
    },
    {
      overlayAttribute: ATTRIBUTE_NAME,
      sourceLocationAttribute: SOLID_SOURCE_LOCATION_ATTRIBUTE,
      toolbarActionSelector: TOOLBAR_ACTION_SELECTOR,
    },
  );

  if (isProductionProject(testInfo.project.name)) {
    expect(sourceResult.sourceLocation).toBeNull();
    expect(sourceResult.filePath ?? "").not.toContain(TOOLBAR_ACTION_SOURCE_PATH);
    return;
  }

  expect(sourceResult.filePath).toContain(TOOLBAR_ACTION_SOURCE_PATH);
  expect(sourceResult.lineNumber).toBe(TOOLBAR_ACTION_SOURCE_LINE_NUMBER);
  expect(sourceResult.columnNumber).toBe(TOOLBAR_ACTION_SOURCE_COLUMN_NUMBER);
  expect(sourceResult.sourceLocation).toContain(
    `${TOOLBAR_ACTION_SOURCE_PATH}:${TOOLBAR_ACTION_SOURCE_LINE_NUMBER}:${TOOLBAR_ACTION_SOURCE_COLUMN_NUMBER}`,
  );
});
