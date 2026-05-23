import type { EditableProperty } from "../types.js";

const EXACT_ALIAS_SCORE = 10000;
const PREFIX_ALIAS_SCORE = 8000;
const STARTS_WITH_SCORE = 5000;
const SUBSTRING_SCORE = 1000;
const POSITION_PENALTY = 100;
const LENGTH_PENALTY = 1;

const normalizeSearch = (query: string): string => query.toLowerCase().replace(/[^a-z0-9]+/g, "");

const normalizeAlias = (alias: string): string => alias.toLowerCase().replace(/-/g, "");

const labelText = (property: EditableProperty): string =>
  `${property.label} ${property.property}`.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Higher score = better match. Returns -Infinity for no match.
//
// Tier 1: exact alias match (e.g. "p" → padding via alias "p")
// Tier 2: alias is prefix of query (e.g. "px4" → padding-x via alias "px")
// Tier 3: query is prefix of label (e.g. "pad" → padding)
// Tier 4: query is substring of label, not at start (e.g. "color" → background color)
//
// Within each tier, longer alias matches and shorter labels rank higher,
// so "px" picks padding-x over padding when both have alias matches.
const scoreProperty = (normalizedQuery: string, property: EditableProperty): number => {
  if (!normalizedQuery) return 0;

  let aliasScore = -Infinity;
  const aliases = property.tailwindAliases;
  if (aliases) {
    for (const alias of aliases) {
      const aliasNorm = normalizeAlias(alias);
      if (!aliasNorm) continue;
      if (normalizedQuery === aliasNorm) {
        aliasScore = Math.max(aliasScore, EXACT_ALIAS_SCORE + aliasNorm.length);
      } else if (normalizedQuery.startsWith(aliasNorm)) {
        aliasScore = Math.max(aliasScore, PREFIX_ALIAS_SCORE + aliasNorm.length);
      }
    }
  }

  const text = labelText(property);
  let substringScore = -Infinity;
  const matchIndex = text.indexOf(normalizedQuery);
  if (matchIndex === 0) {
    substringScore = STARTS_WITH_SCORE - text.length * LENGTH_PENALTY;
  } else if (matchIndex > 0) {
    substringScore = SUBSTRING_SCORE - matchIndex * POSITION_PENALTY - text.length * LENGTH_PENALTY;
  }

  const best = Math.max(aliasScore, substringScore);
  return Number.isFinite(best) ? best : -Infinity;
};

export const filterPropertiesByQuery = (
  properties: EditableProperty[],
  query: string,
): EditableProperty[] => {
  const normalized = normalizeSearch(query);
  if (!normalized) return properties;

  const scored: Array<{ property: EditableProperty; score: number; originalIndex: number }> = [];
  for (let index = 0; index < properties.length; index++) {
    const property = properties[index];
    const score = scoreProperty(normalized, property);
    if (Number.isFinite(score) && score > -Infinity) {
      scored.push({ property, score, originalIndex: index });
    }
  }
  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.originalIndex - right.originalIndex;
  });
  return scored.map((entry) => entry.property);
};
