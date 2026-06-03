import { normalizeFilePath } from "./normalize-file-path.js";

const COMPONENTS_DIRECTORY_NAME = "components";
const UI_DIRECTORY_NAME = "ui";
const PATH_SEPARATOR_PATTERN = /[/\\]/;

export const isIgnoredApplicationSourcePath = (fileName: string | null | undefined): boolean => {
  if (!fileName) return false;

  const segments = normalizeFilePath(fileName).split(PATH_SEPARATOR_PATTERN).filter(Boolean);
  for (let segmentIndex = 0; segmentIndex < segments.length - 1; segmentIndex++) {
    if (
      segments[segmentIndex] === COMPONENTS_DIRECTORY_NAME &&
      segments[segmentIndex + 1] === UI_DIRECTORY_NAME
    ) {
      return true;
    }
  }

  return false;
};
