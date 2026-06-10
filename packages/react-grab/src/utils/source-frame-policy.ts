import { isSourceFile } from "bippy/source";
import { normalizeFilePath } from "./normalize-file-path.js";
import { resolvePackageName } from "./parse-package-name.js";

export interface SourcePathClassification {
  kind: "app-source" | "ignored-app-source" | "package-source" | "unknown";
  packageName: string | null;
}

// design-system wrappers (e.g. shadcn's components/ui) are rarely the file a
// user wants to edit, so grabs resolve to the consuming app source instead.
const IGNORED_SOURCE_PATH_PATTERN = /(?:^|[/\\])components[/\\]ui(?:[/\\]|$)/;

export const classifySourcePath = (
  fileName: string | null | undefined,
): SourcePathClassification => {
  if (!fileName) return { kind: "unknown", packageName: null };

  const packageName = resolvePackageName(fileName);
  if (packageName) return { kind: "package-source", packageName };

  if (!isSourceFile(fileName)) return { kind: "unknown", packageName: null };

  if (IGNORED_SOURCE_PATH_PATTERN.test(normalizeFilePath(fileName))) {
    return { kind: "ignored-app-source", packageName: null };
  }

  return { kind: "app-source", packageName: null };
};
