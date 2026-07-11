import { normalizeFilePath } from "./normalize-file-path.js";

const GENERATED_BUNDLE_PATH_SEGMENTS = ["/assets/", "/_next/static/", "/static/chunks/"];
const JAVASCRIPT_FILE_PATTERN = /\.(?:c|m)?js(?:[?#]|$)/i;

export const isGeneratedBundleSourcePath = (fileName: string | null | undefined): boolean => {
  if (!fileName) return false;
  const normalizedPath = `/${normalizeFilePath(fileName)}`.toLowerCase();
  return (
    JAVASCRIPT_FILE_PATTERN.test(normalizedPath) &&
    GENERATED_BUNDLE_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment))
  );
};
