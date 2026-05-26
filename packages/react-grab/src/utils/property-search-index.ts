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
  matchIndex: number;
  textLength: number;
}

interface PropertySearchCandidate {
  property: EditableProperty;
  score: number;
  originalIndex: number;
}

interface RadixNode {
  entries: PropertySearchEntry[];
  children: Map<string, RadixNode>;
}

export interface PropertySearchIndex {
  search: (query: string) => EditableProperty[];
}

const createNode = (): RadixNode => ({
  entries: [],
  children: new Map(),
});

const normalizeSearchText = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const commonPrefixLength = (left: string, right: string): number => {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index++;
  return index;
};

const insertRadixEntry = (root: RadixNode, term: string, entry: PropertySearchEntry) => {
  if (!term) return;
  let node = root;
  let remaining = term;

  while (remaining) {
    let didSplit = false;
    for (const [edge, child] of node.children) {
      const overlap = commonPrefixLength(edge, remaining);
      if (overlap === 0) continue;

      if (overlap === edge.length) {
        node = child;
        remaining = remaining.slice(overlap);
        didSplit = true;
        break;
      }

      const sharedEdge = edge.slice(0, overlap);
      const oldEdge = edge.slice(overlap);
      const splitNode = createNode();
      splitNode.children.set(oldEdge, child);
      node.children.delete(edge);
      node.children.set(sharedEdge, splitNode);

      if (overlap === remaining.length) {
        splitNode.entries.push(entry);
      } else {
        const newChild = createNode();
        newChild.entries.push(entry);
        splitNode.children.set(remaining.slice(overlap), newChild);
      }
      return;
    }

    if (!didSplit) {
      const child = createNode();
      child.entries.push(entry);
      node.children.set(remaining, child);
      return;
    }
  }

  node.entries.push(entry);
};

const collectRadixEntries = (node: RadixNode, entries: PropertySearchEntry[]) => {
  entries.push(...node.entries);
  for (const child of node.children.values()) {
    collectRadixEntries(child, entries);
  }
};

const searchRadixPrefix = (root: RadixNode, query: string): PropertySearchEntry[] => {
  if (!query) return [];
  let node = root;
  let remaining = query;

  while (remaining) {
    let didDescend = false;
    for (const [edge, child] of node.children) {
      const overlap = commonPrefixLength(edge, remaining);
      if (overlap === 0) continue;
      if (overlap === remaining.length) {
        const entries: PropertySearchEntry[] = [];
        collectRadixEntries(child, entries);
        return entries;
      }
      if (overlap === edge.length) {
        node = child;
        remaining = remaining.slice(overlap);
        didDescend = true;
        break;
      }
      return [];
    }
    if (!didDescend) return [];
  }

  const entries: PropertySearchEntry[] = [];
  collectRadixEntries(node, entries);
  return entries;
};

const searchRadixAncestors = (root: RadixNode, query: string): PropertySearchEntry[] => {
  if (!query) return [];
  const entries: PropertySearchEntry[] = [];
  let node = root;
  let remaining = query;

  while (remaining) {
    let didDescend = false;
    for (const [edge, child] of node.children) {
      const overlap = commonPrefixLength(edge, remaining);
      if (overlap === 0) continue;
      if (overlap < edge.length) return entries;
      node = child;
      entries.push(...node.entries);
      remaining = remaining.slice(overlap);
      didDescend = true;
      break;
    }
    if (!didDescend) return entries;
  }

  return entries;
};

const enumOptionTexts = (property: EditableProperty): readonly string[] => {
  if (property.kind !== "enum") return [];
  const texts: string[] = [];
  for (const option of property.options) {
    const valueText = normalizeSearchText(option.value);
    const labelText = normalizeSearchText(option.label);
    if (valueText) texts.push(valueText);
    if (labelText && labelText !== valueText) texts.push(labelText);
  }
  return texts;
};

const propertyLabelText = (property: EditableProperty): string =>
  normalizeSearchText(`${property.label} ${property.key}`);

const scoreSearchEntry = (query: string, entry: PropertySearchEntry): number => {
  if (entry.kind === "alias") {
    if (query === entry.term) return EDIT_SEARCH_EXACT_ALIAS_SCORE + entry.term.length;
    if (query.startsWith(entry.term)) return EDIT_SEARCH_PREFIX_ALIAS_SCORE + entry.term.length;
    return EDIT_SEARCH_PREFIX_ALIAS_SCORE + query.length;
  }

  if (entry.kind === "enum-option") {
    if (query === entry.term) return EDIT_SEARCH_EXACT_ALIAS_SCORE + entry.term.length;
    return EDIT_SEARCH_PREFIX_ALIAS_SCORE + query.length;
  }

  if (entry.matchIndex === 0) {
    return EDIT_SEARCH_STARTS_WITH_SCORE - entry.textLength * EDIT_SEARCH_LENGTH_PENALTY;
  }
  return (
    EDIT_SEARCH_SUBSTRING_SCORE -
    entry.matchIndex * EDIT_SEARCH_POSITION_PENALTY -
    entry.textLength * EDIT_SEARCH_LENGTH_PENALTY
  );
};

const addSearchCandidate = (
  candidatesByKey: Map<string, PropertySearchCandidate>,
  query: string,
  entry: PropertySearchEntry,
) => {
  const score = scoreSearchEntry(query, entry);
  const current = candidatesByKey.get(entry.property.key);
  if (current && current.score >= score) return;
  candidatesByKey.set(entry.property.key, {
    property: entry.property,
    score,
    originalIndex: entry.originalIndex,
  });
};

const addLabelSuffixes = (
  root: RadixNode,
  property: EditableProperty,
  originalIndex: number,
  labelText: string,
) => {
  for (let index = 0; index < labelText.length; index++) {
    insertRadixEntry(root, labelText.slice(index), {
      property,
      originalIndex,
      kind: "label",
      term: labelText,
      matchIndex: index,
      textLength: labelText.length,
    });
  }
};

export const createPropertySearchIndex = (properties: EditableProperty[]): PropertySearchIndex => {
  const root = createNode();

  for (let originalIndex = 0; originalIndex < properties.length; originalIndex++) {
    const property = properties[originalIndex];
    for (const alias of property.tailwindAliases) {
      const term = normalizeSearchText(alias);
      insertRadixEntry(root, term, {
        property,
        originalIndex,
        kind: "alias",
        term,
        matchIndex: 0,
        textLength: term.length,
      });
    }

    for (const optionText of enumOptionTexts(property)) {
      insertRadixEntry(root, optionText, {
        property,
        originalIndex,
        kind: "enum-option",
        term: optionText,
        matchIndex: 0,
        textLength: optionText.length,
      });
    }

    const labelText = propertyLabelText(property);
    addLabelSuffixes(root, property, originalIndex, labelText);
  }

  const search = (query: string): EditableProperty[] => {
    const normalized = normalizeSearchText(query);
    if (!normalized || isNumericQuery(normalized)) return properties;

    const candidatesByKey = new Map<string, PropertySearchCandidate>();
    for (const entry of searchRadixPrefix(root, normalized)) {
      addSearchCandidate(candidatesByKey, normalized, entry);
    }
    for (const entry of searchRadixAncestors(root, normalized)) {
      if (entry.kind === "label") continue;
      addSearchCandidate(candidatesByKey, normalized, entry);
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
