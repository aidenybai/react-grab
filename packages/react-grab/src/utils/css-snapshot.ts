import {
  ALL_BASELINE_KEYS,
  TRACKED_PROPERTIES,
  type StyleSnapshot,
} from "./property-definitions.js";

export interface ComputedSnapshot {
  [key: string]: string;
}

export const snapshotElement = (element: Element): StyleSnapshot => {
  const computed = getComputedStyle(element);
  const snapshot = {} as StyleSnapshot;
  for (const property of TRACKED_PROPERTIES) {
    snapshot[property] = computed.getPropertyValue(property);
  }
  return snapshot;
};

export const snapshotAllKeys = (computed: CSSStyleDeclaration): ComputedSnapshot => {
  const snapshot: ComputedSnapshot = {};
  for (const propertyKey of ALL_BASELINE_KEYS) {
    snapshot[propertyKey] = computed.getPropertyValue(propertyKey);
  }
  return snapshot;
};
