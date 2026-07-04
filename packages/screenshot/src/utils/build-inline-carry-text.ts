import { isMemoCarriedInlineDeclaration } from "./is-memo-carried-inline-declaration";
import { stripInvalidXmlCharacters } from "./strip-invalid-xml-characters";

// Declarations excluded from the memo descriptor by name-only markers must be
// re-applied per element; carrying the declared value on the clone's style
// attribute lets the capture document resolve it with the same inline-over-rule
// precedence as the source cascade. Elements with an inline backdrop-filter
// never carry: their baked underlay must own the background layers.
export const buildInlineCarryText = (inlineStyle: CSSStyleDeclaration): string => {
  if (
    inlineStyle.getPropertyValue("backdrop-filter") !== "" ||
    inlineStyle.getPropertyValue("-webkit-backdrop-filter") !== ""
  ) {
    return "";
  }
  let carryText = "";
  for (let propertyIndex = 0; propertyIndex < inlineStyle.length; propertyIndex++) {
    const propertyName = inlineStyle.item(propertyIndex);
    const propertyValue = inlineStyle.getPropertyValue(propertyName);
    if (
      isMemoCarriedInlineDeclaration(
        propertyName,
        propertyValue,
        inlineStyle.getPropertyPriority(propertyName),
      )
    ) {
      carryText += `${propertyName}:${propertyValue};`;
    }
  }
  return stripInvalidXmlCharacters(carryText);
};
