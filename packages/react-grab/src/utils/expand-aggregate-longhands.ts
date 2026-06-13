import { AGGREGATE_GROUPS } from "./property-definitions.js";

const AGGREGATE_LONGHANDS = new Map<string, readonly string[]>();
for (const group of AGGREGATE_GROUPS) {
  for (const definition of group) {
    AGGREGATE_LONGHANDS.set(definition.key, definition.longhands);
  }
}

export const expandAggregateLonghands = (propertyKey: string): string[] => {
  if (propertyKey.includes(",")) return propertyKey.split(",");
  const expansion = AGGREGATE_LONGHANDS.get(propertyKey);
  return expansion ? [...expansion] : [propertyKey];
};
