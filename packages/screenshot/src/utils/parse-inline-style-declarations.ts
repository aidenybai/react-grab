import { UNSAFE_INLINE_STYLE_TEXT_PATTERN } from "../constants";
import type { ParsedInlineDeclaration } from "../types";

// Fast-path parser for plain style-attribute texts: splitting on ";" and the
// first ":" is only sound when no value can embed those characters, so any
// text containing strings, url()/var() functions, custom properties,
// comments, escapes, or control characters returns null and the caller falls
// back to the inline CSSOM. Names are lowercased and !important is split off
// the value, matching the CSSOM's getPropertyPriority view.
export const parseInlineStyleDeclarations = (
  styleText: string,
): ParsedInlineDeclaration[] | null => {
  if (UNSAFE_INLINE_STYLE_TEXT_PATTERN.test(styleText)) return null;
  const declarations: ParsedInlineDeclaration[] = [];
  for (const declarationText of styleText.split(";")) {
    const colonIndex = declarationText.indexOf(":");
    if (colonIndex === -1) {
      if (declarationText.trim() !== "") return null;
      continue;
    }
    const propertyName = declarationText.slice(0, colonIndex).trim().toLowerCase();
    if (propertyName === "" || propertyName.startsWith("--")) return null;
    let propertyValue = declarationText.slice(colonIndex + 1).trim();
    let isImportant = false;
    if (/!\s*important$/i.test(propertyValue)) {
      isImportant = true;
      propertyValue = propertyValue.slice(0, propertyValue.lastIndexOf("!")).trim();
    }
    if (propertyValue === "") continue;
    declarations.push({ propertyName, propertyValue, isImportant });
  }
  return declarations;
};
