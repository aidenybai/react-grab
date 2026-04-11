const INTERNAL_ATTRIBUTE_PATTERN = /\s+data-react-grab-[\w-]*(="[^"]*")?/g;

export const isInternalAttribute = (name: string): boolean =>
  name.startsWith("data-react-grab-");

export const stripInternalAttributes = (html: string): string =>
  html.replace(INTERNAL_ATTRIBUTE_PATTERN, "");
