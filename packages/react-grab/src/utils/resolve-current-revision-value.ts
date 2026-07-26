import { FIBER_CONTEXT_REVISION_MAX_ATTEMPTS } from "../constants.js";

export interface CurrentRevisionResolution<Value> {
  isCurrent: () => boolean;
  valuePromise: Promise<Value>;
}

export const resolveCurrentRevisionValue = async <Value>(
  createResolution: () => CurrentRevisionResolution<Value> | null,
  fallbackValue: Value,
): Promise<Value> => {
  let latestValue = fallbackValue;
  for (let attempt = 0; attempt < FIBER_CONTEXT_REVISION_MAX_ATTEMPTS; attempt += 1) {
    const resolution = createResolution();
    if (!resolution) return latestValue;
    latestValue = await resolution.valuePromise;
    if (resolution.isCurrent()) return latestValue;
  }
  return latestValue;
};
