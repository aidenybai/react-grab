interface SavedContentVisibility {
  element: HTMLElement;
  originalValue: string;
}

export const forceContentVisibility = (
  rootElement: Element,
): (() => void) => {
  const savedElements: SavedContentVisibility[] = [];

  const forceVisible = (element: Element) => {
    if (!(element instanceof HTMLElement)) return;
    const computed = getComputedStyle(element);
    const contentVisibility =
      computed.getPropertyValue("content-visibility") || "";

    if (contentVisibility === "auto" || contentVisibility === "hidden") {
      savedElements.push({
        element,
        originalValue: element.style.contentVisibility || "",
      });
      element.style.contentVisibility = "visible";
    }
  };

  forceVisible(rootElement);
  for (const descendant of Array.from(rootElement.querySelectorAll("*"))) {
    forceVisible(descendant);
  }

  return () => {
    for (const { element, originalValue } of savedElements) {
      try {
        element.style.contentVisibility = originalValue;
      } catch {
        continue;
      }
    }
  };
};
