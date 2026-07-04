import type { ParsedInlineDeclaration } from "../types";

let scratchStyle: CSSStyleDeclaration | null = null;

// Expands one shorthand declaration into per-longhand declarations through a
// detached scratch style, so each longhand can be classified (per-element
// lane, carriable, plain) individually — a shorthand like border: mixes
// carriable colors/styles with geometry-read widths, and classifying it
// whole would bake its unique values into the memo descriptor.
export const splitShorthandDeclaration = (
  declaration: ParsedInlineDeclaration,
): ParsedInlineDeclaration[] => {
  const scratch = (scratchStyle ??= document.createElement("span").style);
  scratch.cssText = `${declaration.propertyName}:${declaration.propertyValue}`;
  const longhandDeclarations: ParsedInlineDeclaration[] = [];
  for (let propertyIndex = 0; propertyIndex < scratch.length; propertyIndex++) {
    const longhandName = scratch.item(propertyIndex);
    longhandDeclarations.push({
      propertyName: longhandName,
      propertyValue: scratch.getPropertyValue(longhandName),
      isImportant: declaration.isImportant,
    });
  }
  scratch.cssText = "";
  return longhandDeclarations;
};
