import {
  EDIT_SEARCH_EXACT_ALIAS_SCORE,
  EDIT_SEARCH_LENGTH_PENALTY,
  EDIT_SEARCH_POSITION_PENALTY,
  EDIT_SEARCH_PREFIX_ALIAS_SCORE,
  EDIT_SEARCH_STARTS_WITH_SCORE,
  EDIT_SEARCH_SUBSTRING_SCORE,
  EDIT_SEARCH_TAILWIND_INTENT_SCORE,
  EDIT_SEARCH_TAILWIND_PREFIX_SCORE,
} from "../constants.js";
import type { EditableProperty } from "../types.js";
import { isNumericQuery } from "./is-numeric-query.js";
import {
  tailwindPrefixPropertyKeysForSearchQuery,
  tailwindPropertyKeysForSearchQuery,
} from "./tailwind-class-map.js";

interface PropertySearchEntry {
  property: EditableProperty;
  originalIndex: number;
  kind: "alias" | "enum-option" | "name" | "label";
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
    const labelTerm = normalizeSearchText(property.label);
    if (labelTerm) searchEntries.push({ property, originalIndex, kind: "name", term: labelTerm });
    const propertyKeyTerm = normalizeSearchText(property.key);
    if (propertyKeyTerm && propertyKeyTerm !== labelTerm) {
      searchEntries.push({ property, originalIndex, kind: "name", term: propertyKeyTerm });
    }
    const labelText = normalizeSearchText(`${property.label} ${property.key}`);
    if (labelText) {
      searchEntries.push({ property, originalIndex, kind: "label", term: labelText });
    }
  }
  return searchEntries;
};

const scoreEntry = (query: string, entry: PropertySearchEntry): number | null => {
  if (entry.kind === "alias" || entry.kind === "enum-option" || entry.kind === "name") {
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
  property: EditableProperty,
  originalIndex: number,
  score: number,
) => {
  const current = candidatesByKey.get(property.key);
  if (current && current.score >= score) return;
  candidatesByKey.set(property.key, {
    property,
    score,
    originalIndex,
  });
};

export const createPropertySearchIndex = (properties: EditableProperty[]): PropertySearchIndex => {
  const searchEntries = createSearchEntries(properties);
  const originalIndexByPropertyKey = new Map<string, number>();
  for (let originalIndex = 0; originalIndex < properties.length; originalIndex++) {
    originalIndexByPropertyKey.set(properties[originalIndex].key, originalIndex);
  }
  const addPropertyKeyCandidates = (
    candidatesByKey: Map<string, PropertySearchCandidate>,
    propertyKeys: readonly string[],
    baseScore: number,
  ) => {
    for (let intentIndex = 0; intentIndex < propertyKeys.length; intentIndex++) {
      const propertyKey = propertyKeys[intentIndex];
      const originalIndex = originalIndexByPropertyKey.get(propertyKey);
      if (originalIndex === undefined) continue;
      const property = properties[originalIndex];
      addCandidate(candidatesByKey, property, originalIndex, baseScore - intentIndex);
    }
  };

  const search = (query: string): EditableProperty[] => {
    const normalized = normalizeSearchText(query);
    if (!normalized || isNumericQuery(normalized)) return properties;

    const candidatesByKey = new Map<string, PropertySearchCandidate>();
    addPropertyKeyCandidates(
      candidatesByKey,
      tailwindPropertyKeysForSearchQuery(query),
      EDIT_SEARCH_TAILWIND_INTENT_SCORE,
    );
    addPropertyKeyCandidates(
      candidatesByKey,
      tailwindPrefixPropertyKeysForSearchQuery(query),
      EDIT_SEARCH_TAILWIND_PREFIX_SCORE,
    );
    for (const searchEntry of searchEntries) {
      const score = scoreEntry(normalized, searchEntry);
      if (score !== null) {
        addCandidate(candidatesByKey, searchEntry.property, searchEntry.originalIndex, score);
      }
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
