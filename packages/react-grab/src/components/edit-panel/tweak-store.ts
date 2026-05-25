import { createMemo, createSignal } from "solid-js";
import type { EditableProperty, PendingEdit } from "../../types.js";
import { filterPropertiesByQuery } from "../../utils/fuzzy-score-property.js";

// Discriminated by kind so `value`'s type follows the variant, not
// the union. Eliminates the `as number` / `as string` casts that the
// previous non-correlated container forced at every read site.
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

  // `initialProperties` is bound at panel mount and never changes,
  // so the by-key index is invariant — building it once at store
  // construction avoids a per-keystroke Map allocation inside the
  // hot filteredProperties memo (60Hz during slider drag).
  const propertyByKey = new Map(initialProperties.map((entry) => [entry.key, entry]));

  const filteredProperties = createMemo<EditableProperty[]>(() => {
    const tweaks = tweakedValues();
    const tweakKeys = Object.keys(tweaks);
    if (tweakKeys.length === 0) return baseFilteredProperties();

    // A tweak on an aggregate (e.g. padding-y → padding-top + padding-
    // bottom) also redefines any row whose longhands are fully covered
    // by the tweak's longhands. Only numeric aggregates fan out —
    // colour/enum keys map 1:1 to a single CSS property.
    const numericValueByLonghand = new Map<string, number>();
    for (const key of tweakKeys) {
      const tweak = tweaks[key];
      if (tweak.kind !== "numeric") continue;
      const property = propertyByKey.get(key);
      if (!property) continue;
      for (const longhand of property.cssProperties) {
        numericValueByLonghand.set(longhand, tweak.value);
      }
    }

    return baseFilteredProperties().map((property) => {
      const direct = tweaks[property.key];
      if (direct !== undefined) {
        return overrideValue(property, direct);
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

  // Per-kind branch so the spread + value override carries the
  // correlated value type instead of leaning on a structural cast.
  // Each branch is a 1-line lift; TS narrows the input via
  // property.kind and the override via tweak.kind so the assembled
  // shape statically matches the right discriminated member.
  const overrideValue = (property: EditableProperty, tweak: PropertyTweak): EditableProperty => {
    if (property.kind === "numeric" && tweak.kind === "numeric") {
      return { ...property, value: tweak.value };
    }
    if (property.kind === "color" && tweak.kind === "color") {
      return { ...property, value: tweak.value };
    }
    if (property.kind === "enum" && tweak.kind === "enum") {
      return { ...property, value: tweak.value };
    }
    // Kind mismatch is a store-invariant violation (applyTweak writes
    // kind from the property), but typing it as unreachable keeps the
    // function total without a cast.
    return property;
  };

  // applyTweak constructs the discriminated tweak per-kind so the
  // resulting record statically lines up with PropertyTweak. The
  // caller passes a value of the right kind by construction (commit
  // pipeline routes per-kind), but the per-kind switch makes that
  // invariant a property of the function signature, not a comment.
  const applyTweak = (property: EditableProperty, value: number | string) => {
    const tweak: PropertyTweak =
      property.kind === "numeric"
        ? { kind: "numeric", value: value as number }
        : { kind: property.kind, value: value as string };
    setTweakedValues((current) => ({ ...current, [property.key]: tweak }));
  };

  // Emit in TWEAK insertion order, not canonical property order.
  // `formatEntryCss` collapses pending edits into a per-CSS-property
  // map via last-write-wins, so emission order is part of the
  // contract: a broader newer tweak (padding) must override the stale
  // sides written by an earlier narrower tweak (padding-x). JS Object
  // preserves the original insertion position even when a key is
  // re-assigned, so re-tweaking the same row doesn't reshuffle.
  const buildPendingEdits = (): PendingEdit[] => {
    const tweaks = tweakedValues();
    const pending: PendingEdit[] = [];
    for (const key of Object.keys(tweaks)) {
      const tweak = tweaks[key];
      const property = propertyByKey.get(key);
      if (!property || tweak.value === property.original) continue;
      if (property.kind === "numeric" && tweak.kind === "numeric") {
        pending.push({
          kind: "numeric",
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value,
          unit: property.unit,
        });
      } else if (property.kind !== "numeric" && tweak.kind !== "numeric") {
        pending.push({
          kind: property.kind,
          key: property.key,
          cssProperties: property.cssProperties,
          value: tweak.value,
        });
      }
    }
    return pending;
  };

  // Count only tweaks that differ from the original — stepping a value
  // away and back leaves a tweak record whose value equals the
  // original, and buildPendingEdits already filters those out. Using
  // a looser "any key tweaked" check here makes the discard-confirm
  // flow shake on net-zero edits with nothing to actually save.
  const hasPendingTweaks = () => {
    const tweaks = tweakedValues();
    for (const property of initialProperties) {
      const tweak = tweaks[property.key];
      if (tweak && tweak.value !== property.original) return true;
    }
    return false;
  };
  const hasTweakFor = (key: string) => tweakedValues()[key] !== undefined;

  return {
    filteredProperties,
    applyTweak,
    buildPendingEdits,
    hasPendingTweaks,
    hasTweakFor,
  };
};
