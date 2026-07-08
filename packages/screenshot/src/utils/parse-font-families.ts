import { GENERIC_FONT_FAMILIES } from "../constants";

export const parseFontFamilies = (fontFamilyValue: string | undefined): string[] => {
  if (!fontFamilyValue) return [];
  return fontFamilyValue
    .split(",")
    .map((familyName) =>
      familyName
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase(),
    )
    .filter((familyName) => familyName.length > 0 && !GENERIC_FONT_FAMILIES.has(familyName));
};
