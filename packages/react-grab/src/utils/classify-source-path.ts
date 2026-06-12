import { isSourceFile } from "bippy/source";
import { resolvePackageName } from "./parse-package-name.js";

export interface SourcePathClassification {
  source: "app" | "package" | "unknown";
  packageName: string | null;
}

export const classifySourcePath = (
  fileName: string | null | undefined,
): SourcePathClassification => {
  if (!fileName) return { source: "unknown", packageName: null };

  const packageName = resolvePackageName(fileName);
  if (packageName) return { source: "package", packageName };

  if (!isSourceFile(fileName)) return { source: "unknown", packageName: null };

  return { source: "app", packageName: null };
};
