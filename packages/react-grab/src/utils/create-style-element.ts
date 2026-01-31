export const createStyleElement = (
  attribute: string,
  content: string,
): HTMLStyleElement => {
  const element = document.createElement("style");
  element.setAttribute(attribute, "");
  element.textContent = content;
  document.head.appendChild(element);
  return element;
};
