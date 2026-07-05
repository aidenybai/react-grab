export type FontFaceStyleKeyword = "normal" | "italic" | "oblique";

export const parseFontFaceStyleKeyword = (styleDescriptor: string): FontFaceStyleKeyword | null => {
  const trimmedDescriptor = styleDescriptor.trim().toLowerCase();
  if (trimmedDescriptor === "" || trimmedDescriptor === "auto" || trimmedDescriptor === "normal") {
    return "normal";
  }
  if (trimmedDescriptor === "italic") return "italic";
  if (trimmedDescriptor === "oblique" || trimmedDescriptor.startsWith("oblique ")) {
    return "oblique";
  }
  return null;
};
