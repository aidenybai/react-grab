import { createMemo, createSignal } from "solid-js";
import { EDIT_PROPERTY_MAX_COUNT } from "../../constants.js";
import type { EditableProperty, PendingEdit } from "../../types.js";
import { createPropertySearchIndex } from "../../utils/property-search-index.js";
import { arePropertyValuesEqual } from "./property-values-equal.js";

type PropertyTweak =
  | { kind: "numeric"; value: number }
  | { kind: "color"; value: string }
  | { kind: "enum"; value: string };

interface CreateTweakStoreOptions {
  initialProperties: EditableProperty[];
  searchQuery: () => string;
}

export interface TweakStore {
  filteredProperties: () => EditableProperty[];
  applyTweak: (property: EditableProperty, nextValue: number | string) => void;
  buildPendingEdits: () => PendingEdit[];
  hasPendingTweaks: () => boolean;
  hasTweakFor: (key: string) => boolean;
}

const hasChangedFromOriginal = (property: EditableProperty, tweak: PropertyTweak): boolean => {
  return (
    property.kind === tweak.kind &&
    !arePropertyValuesEqual(property, tweak.value, property.original)
  );
};

export const createTweakStore = (options: CreateTweakStoreOptions): TweakStore => {
  const { initialProperties, searchQuery } = options;
  const [tweaksByKey, setTweaksByKey] = createSignal<Record<string, PropertyTweak>>({});
  const propertySearchIndex = createPropertySearchIndex(initialProperties);

  const baseFilteredProperties = createMemo<EditableProperty[]>(() => {
    const query = searchQuery();
    const currentTweaks = tweaksByKey();
    const candidates = query
      ? initialProperties
      : initialProperties.filter(
          (property) =>
            property.isPrioritized ||
            (property.isCanonical && !property.isDefault) ||
            currentTweaks[property.key] !== undefined,
        );
    return query ? propertySearchIndex.search(query) : candidates.slice(0, EDIT_PROPERTY_MAX_COUNT);
  });

  const propertyByKey = new Map(initialProperties.map((property) => [property.key, property]));

  const filteredProperties = createMemo<EditableProperty[]>(() => {
    const currentTweaks = tweaksByKey();
    const tweakedKeys = Object.keys(currentTweaks);
    if (tweakedKeys.length === 0) return baseFilteredProperties();

    const numericValueByLonghand = new Map<string, number>();
    for (const tweakedKey of tweakedKeys) {
      const tweak = currentTweaks[tweakedKey];
      if (tweak.kind !== "numeric") continue;
      const tweakedProperty = propertyByKey.get(tweakedKey);
      if (!tweakedProperty) continue;
      for (const longhand of tweakedProperty.cssProperties) {
        numericValueByLonghand.set(longhand, tweak.value);
      }
    }

    return baseFilteredProperties().map((property) => {
      const directTweak = currentTweaks[property.key];
      if (directTweak !== undefined) {
        return overrideValue(property, directTweak);
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

  const overrideValue = (property: EditableProperty, tweak: PropertyTweak): EditableProperty => {
    if (property.kind === "numeric" && tweak.kind === "numeric")
      return { ...property, value: tweak.value };
    if (property.kind === "color" && tweak.kind === "color")
      return { ...property, value: tweak.value };
    if (property.kind === "enum" && tweak.kind === "enum")
      return { ...property, value: tweak.value };
    return property;
  };

  const applyTweak = (property: EditableProperty, nextValue: number | string) => {
    let tweak: PropertyTweak;
    if (property.kind === "numeric" && typeof nextValue === "number") {
      tweak = { kind: "numeric", value: nextValue };
    } else if (property.kind === "color" && typeof nextValue === "string") {
      tweak = { kind: "color", value: nextValue };
    } else if (property.kind === "enum" && typeof nextValue === "string") {
      tweak = { kind: "enum", value: nextValue };
    } else {
      return;
    }
    setTweaksByKey((current) => ({ ...current, [property.key]: tweak }));
  };

  const buildPendingEdits = (): PendingEdit[] => {
    const currentTweaks = tweaksByKey();
    const pendingEdits: PendingEdit[] = [];
    for (const tweakedKey of Object.keys(currentTweaks)) {
      const tweak = currentTweaks[tweakedKey];
      const property = propertyByKey.get(tweakedKey);
      if (!property || !hasChangedFromOriginal(property, tweak)) continue;
      if (property.kind === "numeric" && tweak.kind === "numeric") {
        pendingEdits.push({
          kind: "numeric",
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value,
          unit: property.unit,
        });
      } else if (property.kind === "color" && tweak.kind === "color") {
        pendingEdits.push({
          kind: "color",
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value,
        });
      } else if (property.kind === "enum" && tweak.kind === "enum") {
        pendingEdits.push({
          kind: "enum",
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value,
        });
      }
    }
    return pendingEdits;
  };

  const hasPendingTweaks = () => {
    const currentTweaks = tweaksByKey();
    for (const property of initialProperties) {
      const tweak = currentTweaks[property.key];
      if (tweak && hasChangedFromOriginal(property, tweak)) return true;
    }
    return false;
  };
  const hasTweakFor = (key: string) => tweaksByKey()[key] !== undefined;

  return {
    filteredProperties,
    applyTweak,
    buildPendingEdits,
    hasPendingTweaks,
    hasTweakFor,
  };
};
