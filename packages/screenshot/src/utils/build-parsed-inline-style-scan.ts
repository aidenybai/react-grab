import { MEMO_CARRY_INLINE_STYLE_PROPS } from "../constants";
import type { InlineStyleScan, ParsedInlineDeclaration, RelevantStylePropRegistry } from "../types";
import { expandStylePropLonghands } from "./expand-style-prop-longhands";
import { splitShorthandDeclaration } from "./split-shorthand-declaration";

// Raw-parsed counterpart of buildInlineStyleScan: registry ingestion, memo
// descriptor variants, and carry text all derive from the parsed declaration
// list without touching the inline CSSOM. A declaration is skipped from the
// descriptor only when every expanded longhand sits in the per-element lane,
// and carried only when every longhand is carriable, mirroring the
// per-longhand classification of the CSSOM path (a mixed shorthand like
// border: stays in the plain descriptor, which merely costs memo sharing).
export const buildParsedInlineStyleScan = (
  declarations: readonly ParsedInlineDeclaration[],
  perElementProps: ReadonlySet<string>,
  relevantProps: RelevantStylePropRegistry | null,
): InlineStyleScan => {
  let isCarryBlocked = false;
  for (const declaration of declarations) {
    const propertyName = declaration.propertyName;
    if (propertyName === "backdrop-filter" || propertyName === "-webkit-backdrop-filter") {
      isCarryBlocked = true;
    }
    if (relevantProps !== null) {
      for (const longhandName of expandStylePropLonghands(propertyName)) {
        relevantProps.addParsedInlineDeclaration(longhandName, declaration.propertyValue);
      }
    }
  }
  let carryText = "";
  let descriptorWithCarry = "";
  let descriptorPlain = "";
  const appendDeclaration = (declaration: ParsedInlineDeclaration, isCarriable: boolean): void => {
    const priorityText = declaration.isImportant ? "important" : "";
    const plainEntry = `|${declaration.propertyName}:${declaration.propertyValue}!${priorityText}`;
    descriptorPlain += plainEntry;
    if (isCarriable) {
      carryText += `${declaration.propertyName}:${declaration.propertyValue};`;
      descriptorWithCarry += `|~${declaration.propertyName}`;
    } else {
      descriptorWithCarry += plainEntry;
    }
  };
  for (const declaration of declarations) {
    const longhands = expandStylePropLonghands(declaration.propertyName);
    let isEveryLonghandPerElement = true;
    let isEveryLonghandCarriable = true;
    for (const longhandName of longhands) {
      if (!perElementProps.has(longhandName)) isEveryLonghandPerElement = false;
      if (!MEMO_CARRY_INLINE_STYLE_PROPS.has(longhandName)) isEveryLonghandCarriable = false;
    }
    if (isEveryLonghandPerElement) continue;
    const isCarryAllowed = !declaration.isImportant && !isCarryBlocked;
    if (longhands.length > 1 && !isEveryLonghandCarriable) {
      // A shorthand mixing carriable and plain longhands (border: mixes
      // colors/styles with geometry-read widths) is split so its unique
      // carriable values stay out of the memo descriptor.
      for (const longhandDeclaration of splitShorthandDeclaration(declaration)) {
        if (perElementProps.has(longhandDeclaration.propertyName)) continue;
        appendDeclaration(
          longhandDeclaration,
          isCarryAllowed && MEMO_CARRY_INLINE_STYLE_PROPS.has(longhandDeclaration.propertyName),
        );
      }
      continue;
    }
    appendDeclaration(declaration, isCarryAllowed && isEveryLonghandCarriable);
  }
  return { carryText, descriptorWithCarry, descriptorPlain };
};
