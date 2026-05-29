import { alignedValue, valueWithFallback } from "./css-value-resolution.js";
import {
  type AggregateDefinition,
  type StyleSnapshot,
  type TrackedProperty,
} from "./property-definitions.js";
import type { NumericValue } from "./parse-numeric-value.js";

export interface TaggedAggregateEntry {
  definition: AggregateDefinition;
  value: NumericValue;
  isCanonical: boolean;
}

interface ResolvedAggregateEntry {
  definition: AggregateDefinition;
  value: NumericValue;
}

const isResolvedAggregateEntry = (
  entry: ResolvedAggregateEntry | null,
): entry is ResolvedAggregateEntry => entry !== null;

// Picks each longhand's "canonical aggregate" as the largest one that
// covers it at the same value. Padding with 4 uniform sides -> "padding"
// is canonical; y/x aligned but not all four -> "padding-y" + "padding-x";
// nothing aligned -> 4 individual sides. Same algorithm works for margin
// and border-radius regardless of their longhand topology.
export const tagAggregateGroup = (
  snapshot: StyleSnapshot,
  definitions: readonly AggregateDefinition[],
): TaggedAggregateEntry[] => {
  const resolvedAggregates = definitions
    .map((definition) => {
      const value =
        definition.longhands.length === 1
          ? valueWithFallback(snapshot, definition.longhands[0])
          : alignedValue(snapshot, definition.longhands);
      return value ? { definition, value } : null;
    })
    .filter(isResolvedAggregateEntry);

  const canonicalForLonghand = new Map<TrackedProperty, ResolvedAggregateEntry>();
  for (const entry of resolvedAggregates) {
    for (const longhand of entry.definition.longhands) {
      const current = canonicalForLonghand.get(longhand);
      if (!current || entry.definition.longhands.length > current.definition.longhands.length) {
        canonicalForLonghand.set(longhand, entry);
      }
    }
  }
  const canonicalSet = new Set(canonicalForLonghand.values());
  return resolvedAggregates.map((entry) => ({ ...entry, isCanonical: canonicalSet.has(entry) }));
};
