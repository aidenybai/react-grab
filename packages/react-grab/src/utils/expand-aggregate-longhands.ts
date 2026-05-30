import { AGGREGATE_GROUPS } from "./property-definitions.js";

const AGGREGATE_LONGHANDS = new Map<string, readonly string[]>();
for (const group of AGGREGATE_GROUPS) {
  for (const definition of group) {
    AGGREGATE_LONGHANDS.set(definition.key, definition.longhands);
  }
}

export const expandAggregateLonghands = (cssKey: string): string[] => {
  if (cssKey.includes(",")) return cssKey.split(",");
  const expansion = AGGREGATE_LONGHANDS.get(cssKey);
  return expansion ? [...expansion] : [cssKey];
};
