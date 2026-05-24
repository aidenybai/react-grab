import { createMemo, createSignal } from "solid-js";
import type { EditableProperty, PendingEdit } from "../../types.js";
import { filterPropertiesByQuery } from "../../utils/fuzzy-score-property.js";

// Axis aggregates (padding-x, padding-y, margin-x, margin-y) — shown by
// default even when non-canonical so the user can target one axis
// without first searching `px` / `py` / `mx` / `my`. Without this,
// uniform-padding elements collapse to just "padding" and one-axis
// edits feel hidden.
const ALWAYS_VISIBLE_AXIS_KEYS: ReadonlySet<string> = new Set([
  "padding-left,padding-right",
  "padding-top,padding-bottom",
  "margin-left,margin-right",
  "margin-top,margin-bottom",
]);

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
    // No query: surface canonical, non-default rows + any row the user
    // has already tweaked this session. Canonical means "the highest-
    // level form that captures this side", so a uniform padding shows
    // as one row instead of seven. Tweaked rows stay visible after
    // their edit even if their original value matches the baseline —
    // hiding a row the user just touched would be hostile UX.
    const tweaks = tweakedValues();
    const candidates = query
      ? initialProperties
      : initialProperties.filter(
          (entry) =>
            entry.prioritized ||
            (entry.isCanonical && !entry.isDefault) ||
            ALWAYS_VISIBLE_AXIS_KEYS.has(entry.key) ||
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
      pending.push({
        key: property.key,
        cssProperties: property.cssProperties,
        kind: tweak.kind,
        value: tweak.value,
        unit: property.kind === "numeric" ? property.unit : "",
      });
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
