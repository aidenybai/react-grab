import {
  EDIT_SEARCH_EXACT_ALIAS_SCORE,
  EDIT_SEARCH_LENGTH_PENALTY,
  EDIT_SEARCH_POSITION_PENALTY,
  EDIT_SEARCH_PREFIX_ALIAS_SCORE,
  EDIT_SEARCH_STARTS_WITH_SCORE,
  EDIT_SEARCH_SUBSTRING_SCORE,
} from "../constants.js";
import type { EditableProperty } from "../types.js";
import { isNumericQuery } from "./is-numeric-query.js";

interface PropertySearchEntry {
  property: EditableProperty;
  originalIndex: number;
  kind: "alias" | "enum-option" | "label";
  term: string;
}

interface PropertySearchCandidate {
  property: EditableProperty;
  score: number;
  originalIndex: number;
}

export interface PropertySearchIndex {
  search: (query: string) => EditableProperty[];
}

const normalizeSearchText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const enumOptionTexts = (property: EditableProperty): readonly string[] => {
  if (property.kind !== "enum") return [];
  const optionSearchTerms: string[] = [];
  for (const option of property.options) {
    const valueText = normalizeSearchText(option.value);
    const labelText = normalizeSearchText(option.label);
    if (valueText) optionSearchTerms.push(valueText);
    if (labelText && labelText !== valueText) optionSearchTerms.push(labelText);
  }
  return optionSearchTerms;
};

const createSearchEntries = (properties: readonly EditableProperty[]): PropertySearchEntry[] => {
  const searchEntries: PropertySearchEntry[] = [];
  for (let originalIndex = 0; originalIndex < properties.length; originalIndex++) {
    const property = properties[originalIndex];
    for (const alias of property.tailwindAliases) {
      const normalizedAlias = normalizeSearchText(alias);
      if (normalizedAlias) {
        searchEntries.push({ property, originalIndex, kind: "alias", term: normalizedAlias });
      }
    }
    for (const optionSearchTerm of enumOptionTexts(property)) {
      searchEntries.push({
        property,
        originalIndex,
        kind: "enum-option",
        term: optionSearchTerm,
      });
    }
    const labelText = normalizeSearchText(`${property.label} ${property.key}`);
    if (labelText) {
      searchEntries.push({ property, originalIndex, kind: "label", term: labelText });
    }
  }
  return searchEntries;
};

const scoreEntry = (query: string, entry: PropertySearchEntry): number | null => {
  if (entry.kind !== "label") {
    if (query === entry.term) return EDIT_SEARCH_EXACT_ALIAS_SCORE + entry.term.length;
    if (entry.term.startsWith(query) || query.startsWith(entry.term)) {
      return EDIT_SEARCH_PREFIX_ALIAS_SCORE + Math.min(query.length, entry.term.length);
    }
    return null;
  }

  const matchIndex = entry.term.indexOf(query);
  if (matchIndex === -1) return null;
  if (matchIndex === 0) {
    return EDIT_SEARCH_STARTS_WITH_SCORE - entry.term.length * EDIT_SEARCH_LENGTH_PENALTY;
  }
  return (
    EDIT_SEARCH_SUBSTRING_SCORE -
    matchIndex * EDIT_SEARCH_POSITION_PENALTY -
    entry.term.length * EDIT_SEARCH_LENGTH_PENALTY
  );
};

const addCandidate = (
  candidatesByKey: Map<string, PropertySearchCandidate>,
  entry: PropertySearchEntry,
  score: number,
) => {
  const current = candidatesByKey.get(entry.property.key);
  if (current && current.score >= score) return;
  candidatesByKey.set(entry.property.key, {
    property: entry.property,
    score,
    originalIndex: entry.originalIndex,
  });
};

export const createPropertySearchIndex = (properties: EditableProperty[]): PropertySearchIndex => {
  const searchEntries = createSearchEntries(properties);

  const search = (query: string): EditableProperty[] => {
    const normalized = normalizeSearchText(query);
    if (!normalized || isNumericQuery(normalized)) return properties;

    const candidatesByKey = new Map<string, PropertySearchCandidate>();
    for (const searchEntry of searchEntries) {
      const score = scoreEntry(normalized, searchEntry);
      if (score !== null) addCandidate(candidatesByKey, searchEntry, score);
    }

    return Array.from(candidatesByKey.values())
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.originalIndex - right.originalIndex;
      })
      .map((entry) => entry.property);
  };

  return { search };
};
