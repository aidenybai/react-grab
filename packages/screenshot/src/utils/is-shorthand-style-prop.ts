let scratchStyle: CSSStyleDeclaration | null = null;
const shorthandVerdictByProp = new Map<string, boolean>();

export const isShorthandStyleProp = (propertyName: string): boolean => {
  const cachedVerdict = shorthandVerdictByProp.get(propertyName);
  if (cachedVerdict !== undefined) return cachedVerdict;
  scratchStyle ??= document.createElement("span").style;
  scratchStyle.setProperty(propertyName, "initial");
  const verdict = scratchStyle.length > 1;
  scratchStyle.cssText = "";
  shorthandVerdictByProp.set(propertyName, verdict);
  return verdict;
};
