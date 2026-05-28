import { EDIT_PROPERTY_MAX_COUNT } from "../constants.js";
import type { EditableProperty } from "../types.js";
import {
  buildColorProperty,
  buildEnumProperty,
  buildNumericProperty,
  isDefaultByHeuristic,
  matchesBaseline,
  measureBaseline,
  snapshotAllKeys,
  snapshotElement,
  tagAggregateGroup,
  valueWithFallback,
  type ComputedSnapshot,
} from "./css-snapshot.js";
import { isTransparentRgbString } from "./parse-color.js";
import {
  AGGREGATE_GROUPS,
  COLOR_PROPERTIES,
  ENUM_PROPERTIES,
  FONT_FAMILY_DEFINITION,
  resolveFontFamilyOptions,
  SINGLE_PROPERTIES,
} from "./property-definitions.js";
import { sortPropertiesByRecommendation } from "./sort-properties-by-recommendation.js";
import { getElementTailwindProperties } from "./tailwind-class-map.js";

export const buildEditableProperties = (element: Element): EditableProperty[] => {
  const snapshot = snapshotElement(element);
  const computed = getComputedStyle(element);
  const currentAllKeys = snapshotAllKeys(computed);
  const baseline = measureBaseline(element);
  const properties: EditableProperty[] = [];
  const emittedPropertyKeys = new Set<string>();

  const addProperty = (property: EditableProperty) => {
    if (emittedPropertyKeys.has(property.key) || properties.length >= EDIT_PROPERTY_MAX_COUNT)
      return;
    properties.push(property);
    emittedPropertyKeys.add(property.key);
  };

  for (const group of AGGREGATE_GROUPS) {
    for (const entry of tagAggregateGroup(snapshot, group)) {
      addProperty(buildNumericProperty(entry.definition, entry.value, entry.isCanonical));
    }
  }

  for (const single of SINGLE_PROPERTIES) {
    const value = valueWithFallback(snapshot, single.key);
    if (!value) continue;
    addProperty(
      buildNumericProperty(
        { key: single.key, label: single.label, longhands: [single.key] },
        value,
        true,
      ),
    );
  }

  for (const { key, label } of COLOR_PROPERTIES) {
    const rawCssValue = computed.getPropertyValue(key);
    if (!rawCssValue || isTransparentRgbString(rawCssValue)) continue;
    const colorProperty = buildColorProperty(key, label, rawCssValue);
    if (colorProperty) addProperty(colorProperty);
  }

  const fontFamilyRaw = computed.getPropertyValue(FONT_FAMILY_DEFINITION.key);
  if (fontFamilyRaw) {
    const fontFamilyProperty = buildEnumProperty(
      FONT_FAMILY_DEFINITION,
      fontFamilyRaw,
      resolveFontFamilyOptions(fontFamilyRaw),
    );
    if (fontFamilyProperty) addProperty(fontFamilyProperty);
  }

  for (const definition of ENUM_PROPERTIES) {
    const rawCssValue = computed.getPropertyValue(definition.key);
    if (!rawCssValue) continue;
    const enumProperty = buildEnumProperty(definition, rawCssValue);
    if (enumProperty) addProperty(enumProperty);
  }

  return finalizeProperties(
    properties,
    getElementTailwindProperties(element),
    currentAllKeys,
    baseline,
  );
};

const finalizeProperties = (
  properties: EditableProperty[],
  prioritizedKeys: Set<string>,
  currentSnapshot: ComputedSnapshot,
  baseline: ComputedSnapshot | null,
): EditableProperty[] => {
  const prioritizedTier: EditableProperty[] = [];
  const recommendedTier: EditableProperty[] = [];

  for (const property of properties) {
    if (prioritizedKeys.has(property.key)) {
      prioritizedTier.push({ ...property, isPrioritized: true, isDefault: false });
    } else {
      const isDefault = baseline
        ? matchesBaseline(property.cssProperties, currentSnapshot, baseline)
        : isDefaultByHeuristic(property);
      recommendedTier.push({ ...property, isDefault });
    }
  }
  return [
    ...sortPropertiesByRecommendation(prioritizedTier),
    ...sortPropertiesByRecommendation(recommendedTier),
  ];
};
