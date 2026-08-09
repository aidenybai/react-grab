export const isCssColorTransparent = (color: string): boolean => {
  if (color === "transparent") return true;

  const alphaSeparatorIndex = color.lastIndexOf("/");
  if (alphaSeparatorIndex >= 0) {
    return Number.parseFloat(color.slice(alphaSeparatorIndex + 1)) === 0;
  }

  if (!color.startsWith("rgba(")) return false;
  const legacyAlphaSeparatorIndex = color.lastIndexOf(",");
  return (
    legacyAlphaSeparatorIndex >= 0 &&
    Number.parseFloat(color.slice(legacyAlphaSeparatorIndex + 1)) === 0
  );
};
