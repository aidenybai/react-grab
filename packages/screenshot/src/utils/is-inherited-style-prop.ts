import { INHERITED_STYLE_PROPS } from "../constants";

export const isInheritedStyleProp = (propertyName: string): boolean =>
  INHERITED_STYLE_PROPS.has(propertyName) ||
  propertyName.startsWith("font") ||
  propertyName.startsWith("text-emphasis") ||
  propertyName.startsWith("list-style") ||
  propertyName.startsWith("-webkit-text");
