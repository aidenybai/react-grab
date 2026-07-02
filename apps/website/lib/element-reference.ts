import type { SelectedElementPayload } from "react-grab";

export const formatElementReference = (element: SelectedElementPayload): string => {
  const componentName = element.componentName ?? element.tagName;
  const shortPath = element.filePath?.split("/").slice(-2).join("/");
  const location = shortPath
    ? ` (at ${shortPath}:${element.lineNumber ?? 1}:${element.columnNumber ?? 1})`
    : "";
  return `[<${element.tagName}> in ${componentName}${location}]`;
};
