import { PREVIEW_TEXT_MAX_LENGTH } from "../constants.js";
import { getComponentDisplayName, resolveSource } from "../core/context.js";
import { getTagName } from "./get-tag-name.js";

/**
 * Resolve metadata for each element and dispatch a `react-grab:element-selected`
 * CustomEvent on `window`. Consumed by plugin authors and userland integrations
 * that observe the SDK from outside the page object.
 */
export const notifyElementsSelected = async (elements: Element[]): Promise<void> => {
  const elementsPayload = await Promise.all(
    elements.map(async (element) => {
      const source = await resolveSource(element);
      let componentName = source?.componentName ?? null;
      const filePath = source?.filePath;
      const lineNumber = source?.lineNumber ?? undefined;
      const columnNumber = source?.columnNumber ?? undefined;

      if (!componentName) {
        componentName = getComponentDisplayName(element);
      }

      const textContent =
        element instanceof HTMLElement
          ? element.innerText?.slice(0, PREVIEW_TEXT_MAX_LENGTH)
          : undefined;

      return {
        tagName: getTagName(element),
        id: element.id || undefined,
        className: element.getAttribute("class") || undefined,
        textContent,
        componentName: componentName ?? undefined,
        filePath,
        lineNumber,
        columnNumber,
      };
    }),
  );

  window.dispatchEvent(
    new CustomEvent("react-grab:element-selected", {
      detail: {
        elements: elementsPayload,
      },
    }),
  );
};
