import { NON_PAINTING_STYLE_PROPS } from "../constants";

const skipVerdictByProp = new Map<string, boolean>();

export const shouldSkipStyleProp = (propertyName: string): boolean => {
  const cachedVerdict = skipVerdictByProp.get(propertyName);
  if (cachedVerdict !== undefined) return cachedVerdict;
  const verdict =
    propertyName.startsWith("--") ||
    propertyName.includes("animation") ||
    propertyName.includes("transition") ||
    propertyName.startsWith("view-timeline") ||
    propertyName.startsWith("scroll-timeline") ||
    NON_PAINTING_STYLE_PROPS.has(propertyName);
  skipVerdictByProp.set(propertyName, verdict);
  return verdict;
};
