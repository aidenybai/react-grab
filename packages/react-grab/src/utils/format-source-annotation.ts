export const formatSourceAnnotation = (
  componentName?: string | null,
  filePath?: string,
  lineNumber?: number | null,
): string => {
  if (!componentName) return "";
  if (!filePath) return `in ${componentName}`;
  const location = lineNumber ? `${filePath}:${lineNumber}` : filePath;
  return `in ${componentName} (at ${location})`;
};

export const appendSourceAnnotation = (
  content: string,
  annotation: string,
): string => {
  if (!annotation) return content;
  return `${content}\n\n${annotation}`;
};
