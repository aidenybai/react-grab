import { normalizeFilePath } from "./normalize-file-path.js";

const GENERATED_BUNDLE_PATH_PATTERNS = [
  /\/assets\/[^/?#]+-[a-z0-9_-]{6,}\.(?:c|m)?js(?:[?#]|$)/,
  /\/_next\/static\/.*\.(?:c|m)?js(?:[?#]|$)/,
  /\/static\/chunks\/.*\.(?:c|m)?js(?:[?#]|$)/,
];

export const isGeneratedBundleSourcePath = (fileName: string | null | undefined): boolean => {
  if (!fileName) return false;
  const normalizedPath = `/${normalizeFilePath(fileName)}`.toLowerCase();
  return GENERATED_BUNDLE_PATH_PATTERNS.some((pattern) => pattern.test(normalizedPath));
};
