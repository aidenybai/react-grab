import { SPLIT_SHORTHAND_CACHE_CAP } from "../constants";
import type { ParsedInlineDeclaration } from "../types";

let scratchStyle: CSSStyleDeclaration | null = null;
// Splitting is a pure function of name:value (importance is reapplied per
// declaration), and inline-styled trees repeat the same few shorthand values
// across many elements, so the expansions are cached process-wide.
const longhandsByDeclaration = new Map<string, readonly ParsedInlineDeclaration[]>();

// Expands one shorthand declaration into per-longhand declarations through a
// detached scratch style, so each longhand can be classified (per-element
// lane, carriable, plain) individually — a shorthand like border: mixes
// carriable colors/styles with geometry-read widths, and classifying it
// whole would bake its unique values into the memo descriptor.
export const splitShorthandDeclaration = (
  declaration: ParsedInlineDeclaration,
): readonly ParsedInlineDeclaration[] => {
  const declarationKey = `${declaration.propertyName}:${declaration.propertyValue}`;
  const cachedLonghands = longhandsByDeclaration.get(declarationKey);
  if (cachedLonghands !== undefined) {
    if (
      cachedLonghands.length === 0 ||
      cachedLonghands[0].isImportant === declaration.isImportant
    ) {
      return cachedLonghands;
    }
    return cachedLonghands.map((longhandDeclaration) => ({
      ...longhandDeclaration,
      isImportant: declaration.isImportant,
    }));
  }
  const scratch = (scratchStyle ??= document.createElement("span").style);
  scratch.cssText = declarationKey;
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
  if (longhandsByDeclaration.size >= SPLIT_SHORTHAND_CACHE_CAP) longhandsByDeclaration.clear();
  longhandsByDeclaration.set(declarationKey, longhandDeclarations);
  return longhandDeclarations;
};
