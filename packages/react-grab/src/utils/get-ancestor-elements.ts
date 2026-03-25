import { isRootElement } from "./is-root-element.js";

export const getAncestorElements = (element: Element): Element[] => {
  const ancestors: Element[] = [];
  let current = element.parentElement;

  while (current && !isRootElement(current)) {
    ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
};
