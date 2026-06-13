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

interface TweakStore {
  filteredProperties: () => EditableProperty[];
  applyTweak: (property: EditableProperty, nextValue: number | string) => void;
  buildPendingEdits: () => PendingEdit[];
  hasPendingTweaks: () => boolean;
  hasChangedTweakFor: (key: string) => boolean;
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

  // Preview writes longhands last-write-wins, so every consumer that
  // resolves overlapping tweaks (row display sync, prompt building)
  // must see them in commit order. Key insertion order carries that:
  // each commit re-inserts its key at the end, and tweaks whose
  // longhands are fully covered by the new commit are dropped — their
  // preview effect was just overwritten wholesale.
  let lastCommittedTweakKey: string | null = null;

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
    if (lastCommittedTweakKey === property.key) {
      setTweaksByKey((current) => ({ ...current, [property.key]: tweak }));
      return;
    }
    lastCommittedTweakKey = property.key;
    setTweaksByKey((current) => {
      const next: Record<string, PropertyTweak> = {};
      for (const existingKey of Object.keys(current)) {
        if (existingKey === property.key) continue;
        const existingProperty = propertyByKey.get(existingKey);
        const isCoveredByNewTweak =
          existingProperty !== undefined &&
          existingProperty.cssProperties.every((longhand) =>
            property.cssProperties.includes(longhand),
          );
        if (isCoveredByNewTweak) continue;
        next[existingKey] = current[existingKey];
      }
      next[property.key] = tweak;
      return next;
    });
  };

  const buildPendingEdits = (): PendingEdit[] => {
    const currentTweaks = tweaksByKey();
    const pendingEdits: PendingEdit[] = [];
    const changedCssProperties = new Set<string>();
    for (const tweakedKey of Object.keys(currentTweaks)) {
      const tweak = currentTweaks[tweakedKey];
      const property = propertyByKey.get(tweakedKey);
      if (!property || property.kind !== tweak.kind) continue;
      const isChanged = hasChangedFromOriginal(property, tweak);
      // A back-to-original tweak still matters when an earlier (wider)
      // tweak changed one of its longhands: `pt-4`, `p-6`, then top
      // back to its original must emit `padding-top` or the prompt
      // claims the `padding: 24px` fan-out applies to the top side too.
      const isOverridingChangedTweak =
        !isChanged &&
        property.cssProperties.some((cssProperty) => changedCssProperties.has(cssProperty));
      if (!isChanged && !isOverridingChangedTweak) continue;
      if (isChanged) {
        for (const cssProperty of property.cssProperties) changedCssProperties.add(cssProperty);
      }
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
  // A no-op commit must not count as tweaked, or Enter would submit
  // instead of opening the inline editor.
  const hasChangedTweakFor = (key: string): boolean => {
    const tweak = tweaksByKey()[key];
    const property = propertyByKey.get(key);
    return Boolean(tweak && property && hasChangedFromOriginal(property, tweak));
  };

  return {
    filteredProperties,
    applyTweak,
    buildPendingEdits,
    hasPendingTweaks,
    hasChangedTweakFor,
  };
};
