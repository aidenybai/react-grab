export const appendStackContext = (
  content: string,
  stackContext: string,
): string => {
  if (!stackContext) return content;
  return `${content}\n${stackContext}`;
};
