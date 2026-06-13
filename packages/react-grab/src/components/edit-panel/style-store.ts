import { createMemo, createSignal } from "solid-js";
import { EDIT_PROPERTY_MAX_COUNT } from "../../constants.js";
import type { EditableProperty, PendingEdit } from "../../types.js";
import { createPropertySearchIndex } from "../../utils/property-search-index.js";
import { arePropertyValuesEqual } from "./property-values-equal.js";

type PropertyStyle =
  | { kind: "numeric"; value: number }
  | { kind: "color"; value: string }
  | { kind: "enum"; value: string };

interface CreateStyleStoreOptions {
  initialProperties: EditableProperty[];
  searchQuery: () => string;
}

interface StyleStore {
  filteredProperties: () => EditableProperty[];
  applyStyle: (property: EditableProperty, nextValue: number | string) => void;
  buildPendingEdits: () => PendingEdit[];
  hasPendingStyles: () => boolean;
  hasChangedStyleFor: (key: string) => boolean;
}

const hasChangedFromOriginal = (property: EditableProperty, style: PropertyStyle): boolean => {
  return (
    property.kind === style.kind &&
    !arePropertyValuesEqual(property, style.value, property.original)
  );
};

export const createStyleStore = (options: CreateStyleStoreOptions): StyleStore => {
  const { initialProperties, searchQuery } = options;
  const [stylesByKey, setStylesByKey] = createSignal<Record<string, PropertyStyle>>({});
  const propertySearchIndex = createPropertySearchIndex(initialProperties);

  const baseFilteredProperties = createMemo<EditableProperty[]>(() => {
    const query = searchQuery();
    const currentStyles = stylesByKey();
    const candidates = query
      ? initialProperties
      : initialProperties.filter(
          (property) =>
            property.isPrioritized ||
            (property.isCanonical && !property.isDefault) ||
            currentStyles[property.key] !== undefined,
        );
    return query ? propertySearchIndex.search(query) : candidates.slice(0, EDIT_PROPERTY_MAX_COUNT);
  });

  const propertyByKey = new Map(initialProperties.map((property) => [property.key, property]));

  const filteredProperties = createMemo<EditableProperty[]>(() => {
    const currentStyles = stylesByKey();
    const styledKeys = Object.keys(currentStyles);
    if (styledKeys.length === 0) return baseFilteredProperties();

    const numericValueByLonghand = new Map<string, number>();
    for (const styledKey of styledKeys) {
      const style = currentStyles[styledKey];
      if (style.kind !== "numeric") continue;
      const styledProperty = propertyByKey.get(styledKey);
      if (!styledProperty) continue;
      for (const longhand of styledProperty.cssProperties) {
        numericValueByLonghand.set(longhand, style.value);
      }
    }

    return baseFilteredProperties().map((property) => {
      const directStyle = currentStyles[property.key];
      if (directStyle !== undefined) {
        return overrideValue(property, directStyle);
      }
      if (property.kind !== "numeric") return property;
      const firstLonghandValue = numericValueByLonghand.get(property.cssProperties[0]);
      if (firstLonghandValue === undefined) return property;
      const allCoveredSameValue = property.cssProperties.every(
        (longhand) => numericValueByLonghand.get(longhand) === firstLonghandValue,
      );
      return allCoveredSameValue ? { ...property, value: firstLonghandValue } : property;
    });
  });

  const overrideValue = (property: EditableProperty, style: PropertyStyle): EditableProperty => {
    if (property.kind === "numeric" && style.kind === "numeric")
      return { ...property, value: style.value };
    if (property.kind === "color" && style.kind === "color")
      return { ...property, value: style.value };
    if (property.kind === "enum" && style.kind === "enum")
      return { ...property, value: style.value };
    return property;
  };

  // Overlapping styles resolve last-write-wins, so every consumer that
  // reads them (filteredProperties' fan-out, buildPendingEdits' forward
  // scan) must see them in commit order. A Record preserves insertion
  // order, so the just-committed key is kept last: re-committing the
  // current last key spreads it in place; committing any other key
  // rebuilds the map, appends that key, and drops styles whose longhands
  // are now fully covered (their preview was overwritten wholesale).
  const applyStyle = (property: EditableProperty, nextValue: number | string) => {
    let style: PropertyStyle;
    if (property.kind === "numeric" && typeof nextValue === "number") {
      style = { kind: "numeric", value: nextValue };
    } else if (property.kind === "color" && typeof nextValue === "string") {
      style = { kind: "color", value: nextValue };
    } else if (property.kind === "enum" && typeof nextValue === "string") {
      style = { kind: "enum", value: nextValue };
    } else {
      return;
    }
    setStylesByKey((current) => {
      const existingKeys = Object.keys(current);
      if (existingKeys[existingKeys.length - 1] === property.key) {
        return { ...current, [property.key]: style };
      }
      const next: Record<string, PropertyStyle> = {};
      for (const existingKey of existingKeys) {
        if (existingKey === property.key) continue;
        const existingProperty = propertyByKey.get(existingKey);
        const isCoveredByNewStyle =
          existingProperty !== undefined &&
          existingProperty.cssProperties.every((longhand) =>
            property.cssProperties.includes(longhand),
          );
        if (isCoveredByNewStyle) continue;
        next[existingKey] = current[existingKey];
      }
      next[property.key] = style;
      return next;
    });
  };

  const buildPendingEdits = (): PendingEdit[] => {
    const currentStyles = stylesByKey();
    const pendingEdits: PendingEdit[] = [];
    const changedCssProperties = new Set<string>();
    for (const styledKey of Object.keys(currentStyles)) {
      const style = currentStyles[styledKey];
      const property = propertyByKey.get(styledKey);
      if (!property || property.kind !== style.kind) continue;
      const isChanged = hasChangedFromOriginal(property, style);
      // A back-to-original style still matters when an earlier (wider)
      // style changed one of its longhands: `pt-4`, `p-6`, then top
      // back to its original must emit `padding-top` or the prompt
      // claims the `padding: 24px` fan-out applies to the top side too.
      const isOverridingChangedStyle =
        !isChanged &&
        property.cssProperties.some((cssProperty) => changedCssProperties.has(cssProperty));
      if (!isChanged && !isOverridingChangedStyle) continue;
      if (isChanged) {
        for (const cssProperty of property.cssProperties) changedCssProperties.add(cssProperty);
      }
      if (property.kind === "numeric" && style.kind === "numeric") {
        pendingEdits.push({
          kind: "numeric",
          key: property.key,
          cssProperties: property.cssProperties,
          value: style.value,
          unit: property.unit,
        });
      } else if (property.kind === "color" && style.kind === "color") {
        pendingEdits.push({
          kind: "color",
          key: property.key,
          cssProperties: property.cssProperties,
          value: style.value,
        });
      } else if (property.kind === "enum" && style.kind === "enum") {
        pendingEdits.push({
          kind: "enum",
          key: property.key,
          cssProperties: property.cssProperties,
          value: style.value,
        });
      }
    }
    return pendingEdits;
  };

  const hasPendingStyles = () => {
    const currentStyles = stylesByKey();
    for (const property of initialProperties) {
      const style = currentStyles[property.key];
      if (style && hasChangedFromOriginal(property, style)) return true;
    }
    return false;
  };

  // A no-op commit must not count as changed, or Enter would submit
  // instead of opening the inline editor.
  const hasChangedStyleFor = (key: string): boolean => {
    const style = stylesByKey()[key];
    const property = propertyByKey.get(key);
    return Boolean(style && property && hasChangedFromOriginal(property, style));
  };

  return {
    filteredProperties,
    applyStyle,
    buildPendingEdits,
    hasPendingStyles,
    hasChangedStyleFor,
  };
};
