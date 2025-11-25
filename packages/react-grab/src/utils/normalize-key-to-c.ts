const C_LIKE_CHARACTERS = new Set([
  "c",
  "\u0441", // Cyrillic es
  "\u023c", // c with stroke
  "\u2184", // reversed c
  "\u1d04", // modifier small c
  "\u1d9c", // modifier small c turned
  "\u2c7c", // latin small c with palatal hook
  "\u217d", // small roman numeral 100 (looks like c)
]);

export const isCLikeKey = (key: string): boolean => {
  if (!key || key.length !== 1) return false;
  const stripped = key.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  return C_LIKE_CHARACTERS.has(stripped);
};
