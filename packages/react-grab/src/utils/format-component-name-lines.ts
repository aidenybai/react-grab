export const formatComponentNameLines = (componentNames: string[]): string =>
  componentNames.map((componentName) => `\n  in ${componentName}`).join("");
