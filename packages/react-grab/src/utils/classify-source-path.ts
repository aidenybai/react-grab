import { isSourceFile } from "bippy/source";
import { resolvePackageName } from "./parse-package-name.js";

export interface SourcePathClassification {
  kind: "app-source" | "package-source" | "unknown";
  packageName: string | null;
}

export const classifySourcePath = (
  fileName: string | null | undefined,
): SourcePathClassification => {
  if (!fileName) return { kind: "unknown", packageName: null };

  const packageName = resolvePackageName(fileName);
  if (packageName) return { kind: "package-source", packageName };

  if (!isSourceFile(fileName)) return { kind: "unknown", packageName: null };

  return { kind: "app-source", packageName: null };
};
