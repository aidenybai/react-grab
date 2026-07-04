let scratchStyle: CSSStyleDeclaration | null = null;
const longhandsByProp = new Map<string, readonly string[]>();

// A shorthand's longhand set is value-independent, so a scratch "initial"
// assignment enumerates it once per property name. Non-shorthands (and
// unknown names, which the scratch drops) expand to themselves.
export const expandStylePropLonghands = (propertyName: string): readonly string[] => {
  const cachedLonghands = longhandsByProp.get(propertyName);
  if (cachedLonghands !== undefined) return cachedLonghands;
  const scratch = (scratchStyle ??= document.createElement("span").style);
  scratch.setProperty(propertyName, "initial");
  const longhands: readonly string[] =
    scratch.length > 1
      ? Array.from({ length: scratch.length }, (_, itemIndex) => scratch.item(itemIndex))
      : [propertyName];
  scratch.cssText = "";
  longhandsByProp.set(propertyName, longhands);
  return longhands;
};
