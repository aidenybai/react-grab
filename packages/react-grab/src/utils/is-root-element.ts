export const isRootElement = (element: Element): boolean => {
  const tagName = element.tagName.toUpperCase();
  return tagName === "HTML" || tagName === "BODY";
};
