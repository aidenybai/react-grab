import type { EditableProperty } from "../types.js";
import { isNumericQuery } from "./is-numeric-query.js";

const EXACT_ALIAS_SCORE = 10000;
const PREFIX_ALIAS_SCORE = 8000;
const STARTS_WITH_SCORE = 5000;
const SUBSTRING_SCORE = 1000;
const POSITION_PENALTY = 100;
const LENGTH_PENALTY = 1;

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const labelText = (property: EditableProperty): string =>
  normalize(`${property.label} ${property.key}`);

// Higher score = better match. Tiered so exact Tailwind alias matches
// (`p` → padding) outrank text-based fuzzy hits, and aliases that
// PREFIX the query (`px4` → padding-x via `px`) outrank substring
// matches. Within a tier, longer alias matches and shorter labels win.
const scoreProperty = (query: string, property: EditableProperty): number => {
  if (!query) return 0;

  let aliasScore = -Infinity;
  for (const alias of property.tailwindAliases) {
    const aliasNorm = normalize(alias);
    if (!aliasNorm) continue;
    if (query === aliasNorm) {
      aliasScore = Math.max(aliasScore, EXACT_ALIAS_SCORE + aliasNorm.length);
    } else if (query.startsWith(aliasNorm)) {
      aliasScore = Math.max(aliasScore, PREFIX_ALIAS_SCORE + aliasNorm.length);
    }
  }

  const text = labelText(property);
  let substringScore = -Infinity;
  const matchIndex = text.indexOf(query);
  if (matchIndex === 0) {
    substringScore = STARTS_WITH_SCORE - text.length * LENGTH_PENALTY;
  } else if (matchIndex > 0) {
    substringScore = SUBSTRING_SCORE - matchIndex * POSITION_PENALTY - text.length * LENGTH_PENALTY;
  }

  return Math.max(aliasScore, substringScore);
};

export const filterPropertiesByQuery = (
  properties: EditableProperty[],
  query: string,
): EditableProperty[] => {
  const normalized = normalize(query);
  if (!normalized) return properties;
  // Pure-number queries are literal value inputs, not search terms —
  // filtering would orphan the active property mid-keystroke.
  if (isNumericQuery(normalized)) return properties;

  const scored: Array<{ property: EditableProperty; score: number; originalIndex: number }> = [];
  for (let index = 0; index < properties.length; index++) {
    const property = properties[index];
    const score = scoreProperty(normalized, property);
    if (Number.isFinite(score)) {
      scored.push({ property, score, originalIndex: index });
    }
  }
  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.originalIndex - right.originalIndex;
  });
  return scored.map((entry) => entry.property);
};
