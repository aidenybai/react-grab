import type { ComparativeIntent, ComparativeResolution, EditableProperty } from "../types.js";
import { expandAggregateLonghands } from "./expand-aggregate-longhands.js";
import { AGGREGATE_GROUPS } from "./property-definitions.js";
import { propertyKeyForAlias } from "./tailwind-class-map.js";

const ORDINAL_ENUM_KEYS = new Set(["font-weight"]);

// Maps each side longhand of the box aggregates (padding/margin/radius/
// border-width/inset) back to its all-sides key so an unaligned subject like
// "padding" resolves to the same fan-out target on every keystroke. The size
// group is excluded so "width"/"height" stay independent rows.
const CANONICAL_AGGREGATE_KEY_BY_LONGHAND = ((): Map<string, string> => {
  const longhandToKey = new Map<string, string>();
  for (const group of AGGREGATE_GROUPS) {
    const topLevel = group[0];
    if (topLevel.key === "width,height") continue;
    for (const longhand of topLevel.longhands) longhandToKey.set(longhand, topLevel.key);
  }
  return longhandToKey;
})();

const normalizeSubject = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const isComparable = (property: EditableProperty): boolean =>
  property.kind === "numeric" || (property.kind === "enum" && ORDINAL_ENUM_KEYS.has(property.key));

const canonicalizeKey = (key: string): string => {
  if (key.includes(",")) return key;
  return CANONICAL_AGGREGATE_KEY_BY_LONGHAND.get(key) ?? key;
};

const matchSubjectProperty = (
  subject: string,
  properties: readonly EditableProperty[],
): EditableProperty | null => {
  const normalizedSubject = normalizeSubject(subject);
  if (!normalizedSubject) return null;
  let prefixMatch: EditableProperty | null = null;
  for (const property of properties) {
    const terms = [property.key, property.label, ...property.tailwindAliases];
    for (const term of terms) {
      const normalizedTerm = normalizeSubject(term);
      if (!normalizedTerm) continue;
      if (normalizedTerm === normalizedSubject) return property;
      if (
        !prefixMatch &&
        (normalizedTerm.startsWith(normalizedSubject) ||
          normalizedSubject.startsWith(normalizedTerm))
      ) {
        prefixMatch = property;
      }
    }
  }
  return prefixMatch;
};

const findPropertiesForKey = (
  key: string,
  properties: readonly EditableProperty[],
): EditableProperty[] => {
  const direct = properties.find((property) => property.key === key && isComparable(property));
  if (direct) return [direct];
  const longhands = expandAggregateLonghands(key);
  return properties.filter(
    (property) =>
      property.kind === "numeric" &&
      property.cssProperties.length === 1 &&
      longhands.includes(property.cssProperties[0]),
  );
};

const resolveSubjectKey = (
  subject: string,
  properties: readonly EditableProperty[],
): string | null => {
  const aliasKey = propertyKeyForAlias(subject);
  if (aliasKey) return canonicalizeKey(aliasKey);
  const matched = matchSubjectProperty(subject, properties);
  return matched ? canonicalizeKey(matched.key) : null;
};

export const resolveComparativeTargets = (
  intent: ComparativeIntent,
  properties: readonly EditableProperty[],
): ComparativeResolution | null => {
  const candidateKeys: string[] = [];
  if (intent.subject) {
    const subjectKey = resolveSubjectKey(intent.subject, properties);
    if (subjectKey) candidateKeys.push(subjectKey);
  }
  if (intent.dimensionCandidates) candidateKeys.push(...intent.dimensionCandidates);

  for (const key of candidateKeys) {
    const targets = findPropertiesForKey(key, properties);
    if (targets.length > 0) {
      return { targets, direction: intent.direction, magnitude: intent.magnitude };
    }
  }
  return null;
};
