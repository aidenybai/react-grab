import { isMemoCarriedInlineDeclaration } from "./is-memo-carried-inline-declaration";
import { stripInvalidXmlCharacters } from "./strip-invalid-xml-characters";
import type { InlineStyleScan } from "../types";

// One pass over the inline CSSOM produces both memo-descriptor variants and
// the carry text, since getPropertyValue on inline declarations is expensive
// enough that separate descriptor/carry loops dominate large inline-styled
// trees. Declarations excluded from the memo descriptor by name-only markers
// are re-applied per element via the carry text on the clone's style
// attribute, which resolves with the same inline-over-rule precedence as the
// source cascade. Elements with an inline backdrop-filter never carry: their
// baked underlay must own the background layers.
export const buildInlineStyleScan = (
  inlineStyle: CSSStyleDeclaration,
  perElementProps: ReadonlySet<string>,
): InlineStyleScan => {
  const isCarryBlocked =
    inlineStyle.getPropertyValue("backdrop-filter") !== "" ||
    inlineStyle.getPropertyValue("-webkit-backdrop-filter") !== "";
  let carryText = "";
  let descriptorWithCarry = "";
  let descriptorPlain = "";
  for (let propertyIndex = 0; propertyIndex < inlineStyle.length; propertyIndex++) {
    const propertyName = inlineStyle.item(propertyIndex);
    if (perElementProps.has(propertyName)) continue;
    const propertyValue = inlineStyle.getPropertyValue(propertyName);
    const propertyPriority = inlineStyle.getPropertyPriority(propertyName);
    const plainEntry = `|${propertyName}:${propertyValue}!${propertyPriority}`;
    descriptorPlain += plainEntry;
    if (
      !isCarryBlocked &&
      isMemoCarriedInlineDeclaration(propertyName, propertyValue, propertyPriority)
    ) {
      carryText += `${propertyName}:${propertyValue};`;
      descriptorWithCarry += `|~${propertyName}`;
    } else {
      descriptorWithCarry += plainEntry;
    }
  }
  return {
    carryText: stripInvalidXmlCharacters(carryText),
    descriptorWithCarry,
    descriptorPlain,
    registryFeed: null,
  };
};
