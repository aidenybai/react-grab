const TRANSPARENT_VALUES = new Set(["rgba(0, 0, 0, 0)", "transparent"]);

export const resolveAncestorBackground = (element: Element): string => {
  let currentElement: Element | null = element.parentElement;

  while (currentElement) {
    const backgroundColor = getComputedStyle(currentElement).backgroundColor;
    if (backgroundColor && !TRANSPARENT_VALUES.has(backgroundColor)) {
      return backgroundColor;
    }
    currentElement = currentElement.parentElement;
  }

  return "";
};
