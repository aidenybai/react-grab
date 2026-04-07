import { normalizeFileName } from "bippy/source";

const BUNDLER_LAYER_PREFIX_REGEX = /^(?:\.\/)?\/?\([a-z][a-z0-9-]*\)\//;

export const normalizeFilePath = (fileName: string): string => {
  let normalized = normalizeFileName(fileName);
  normalized = normalized.replace(BUNDLER_LAYER_PREFIX_REGEX, "");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
};
