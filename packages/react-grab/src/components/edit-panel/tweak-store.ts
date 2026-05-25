import { createMemo, createSignal } from "solid-js";
import type { EditableProperty, PendingEdit } from "../../types.js";
import { filterPropertiesByQuery } from "../../utils/fuzzy-score-property.js";

interface PropertyTweak {
  kind: EditableProperty["kind"];
  value: number | string;
}

interface CreateTweakStoreOptions {
  initialProperties: EditableProperty[];
  searchQuery: () => string;
}

export interface TweakStore {
  filteredProperties: () => EditableProperty[];
  applyTweak: (property: EditableProperty, value: number | string) => void;
  buildPendingEdits: () => PendingEdit[];
  hasPendingTweaks: () => boolean;
  hasTweakFor: (key: string) => boolean;
}

// Canonical tweak state for the edit panel. Keeps `kind` on every stored
// tweak so readers (filteredProperties, buildPendingEdits) never have to
// re-discover it via `typeof`/property-kind narrowing the way the older
// `Record<string, number | string>` shape forced.
export const createTweakStore = (options: CreateTweakStoreOptions): TweakStore => {
  const { initialProperties, searchQuery } = options;
  const [tweakedValues, setTweakedValues] = createSignal<Record<string, PropertyTweak>>({});

  const baseFilteredProperties = createMemo<EditableProperty[]>(() => {
    const query = searchQuery();
    const tweaks = tweakedValues();
    // Default-list rule (no query): show only what's actually styled or
    // touched — anything at baseline is discoverable via search.
    //   - prioritized: element has a Tailwind class targeting this key
    //   - isCanonical && !isDefault: value differs from a styling-free
    //     baseline clone of the same tag
    //   - tweaked this session: keep visible after a tweak even if the
    //     new value happens to match baseline
    const candidates = query
      ? initialProperties
      : initialProperties.filter(
          (entry) =>
            entry.prioritized ||
            (entry.isCanonical && !entry.isDefault) ||
            tweaks[entry.key] !== undefined,
        );
    return filterPropertiesByQuery(candidates, query);
  });

  const filteredProperties = createMemo<EditableProperty[]>(() => {
    const tweaks = tweakedValues();
    const tweakKeys = Object.keys(tweaks);
    if (tweakKeys.length === 0) return baseFilteredProperties();

    // A tweak on an aggregate (e.g. padding-y → padding-top + padding-
    // bottom) also redefines any row whose longhands are fully covered
    // by the tweak's longhands. Only numeric aggregates fan out —
    // colour/enum keys map 1:1 to a single CSS property.
    const numericValueByLonghand = new Map<string, number>();
    const propertyByKey = new Map(initialProperties.map((entry) => [entry.key, entry]));
    for (const key of tweakKeys) {
      const tweak = tweaks[key];
      if (tweak.kind !== "numeric") continue;
      const property = propertyByKey.get(key);
      if (!property) continue;
      for (const longhand of property.cssProperties) {
        numericValueByLonghand.set(longhand, tweak.value as number);
      }
    }

    return baseFilteredProperties().map((property) => {
      const direct = tweaks[property.key];
      if (direct !== undefined) {
        // The store guarantees kind matches the property the tweak was
        // written against; cast through unknown is safe and avoids
        // re-narrowing the discriminated value at every read site.
        return { ...property, value: direct.value } as unknown as EditableProperty;
      }
      if (property.kind !== "numeric") return property;
      const first = numericValueByLonghand.get(property.cssProperties[0]);
      if (first === undefined) return property;
      const allCoveredSameValue = property.cssProperties.every(
        (longhand) => numericValueByLonghand.get(longhand) === first,
      );
      return allCoveredSameValue ? { ...property, value: first } : property;
    });
  });

  const applyTweak = (property: EditableProperty, value: number | string) => {
    setTweakedValues((current) => ({
      ...current,
      [property.key]: { kind: property.kind, value },
    }));
  };

  const buildPendingEdits = (): PendingEdit[] => {
    const tweaks = tweakedValues();
    const pending: PendingEdit[] = [];
    for (const property of initialProperties) {
      const tweak = tweaks[property.key];
      if (!tweak || tweak.value === property.original) continue;
      if (property.kind === "numeric") {
        pending.push({
          kind: "numeric",
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value as number,
          unit: property.unit,
        });
      } else {
        pending.push({
          kind: property.kind,
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value as string,
        });
      }
    }
    return pending;
  };

  const hasPendingTweaks = () => Object.keys(tweakedValues()).length > 0;
  const hasTweakFor = (key: string) => tweakedValues()[key] !== undefined;

  return {
    filteredProperties,
    applyTweak,
    buildPendingEdits,
    hasPendingTweaks,
    hasTweakFor,
  };
};
