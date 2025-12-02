import { normalizeFileName as bippyNormalizeFileName } from "bippy/source";

const TURBOPACK_PROJECT_PREFIX = /^\[project\]\//;

export const normalizeFileName = (fileName: string): string => {
  const normalized = bippyNormalizeFileName(fileName);
  return normalized.replace(TURBOPACK_PROJECT_PREFIX, "");
};



