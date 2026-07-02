export interface GrabbedElementPayload {
  tagName: string;
  componentName?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export const shortFileName = (element: GrabbedElementPayload): string => {
  if (element.filePath) return element.filePath.split("/").slice(-2).join("/");
  return "components/grab-demo.tsx";
};

export const formatElementReference = (element: GrabbedElementPayload): string => {
  const componentName = element.componentName ?? element.tagName;
  const location = element.filePath
    ? ` (at ${shortFileName(element)}:${element.lineNumber ?? 1}:${element.columnNumber ?? 1})`
    : "";
  return `[<${element.tagName}> in ${componentName}${location}]`;
};
