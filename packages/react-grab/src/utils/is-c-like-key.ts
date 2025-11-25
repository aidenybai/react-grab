const C_LIKE_CHARACTERS = new Set([
  "c",
  "C",
  "\u0441", // Cyrillic small es
  "\u0421", // Cyrillic capital es
  "\u023c", // c with stroke
  "\u023b", // C with stroke
  "\u2184", // reversed c
  "\u2183", // reversed C
  "\u1d04", // modifier small c
  "\u1d9c", // modifier small c turned
  "\u2c7c", // latin small c with palatal hook
  "\u217d", // small roman numeral 100
  "\u216d", // capital roman numeral 100
  "ç", // c with cedilla
  "Ç", // C with cedilla
  "ć", // c with acute
  "Ć", // C with acute
  "č", // c with caron
  "Č", // C with caron
  "ĉ", // c with circumflex
  "Ĉ", // C with circumflex
  "ċ", // c with dot above
  "Ċ", // C with dot above
]);

export const isCLikeKey = (key: string, code?: string): boolean => {
  if (code === "KeyC") return true;
  if (!key || key.length !== 1) return false;
  return C_LIKE_CHARACTERS.has(key);
};
