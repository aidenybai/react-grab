import { SHARED_UI_SOURCE_PATH_SEGMENTS } from "../constants.js";
import { normalizeFilePath } from "./normalize-file-path.js";

// Reusable UI building blocks (shadcn components/ui, a monorepo design system,
// headless primitives) are app-owned but low-signal: they wrap many features
// without being any one feature's source. We surface them but, like package
// frames, exempt them from the compact line budget so a wrapper-heavy trace can
// reach the meaningful surface underneath.
export const isSharedUiSourcePath = (fileName: string | null | undefined): boolean => {
  if (!fileName) return false;
  const normalizedPath = `/${normalizeFilePath(fileName)}/`.toLowerCase();
  return SHARED_UI_SOURCE_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment));
};
