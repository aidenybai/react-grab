import { FIBER_CONTEXT_REVISION_MAX_ATTEMPTS } from "../constants.js";

export interface CurrentRevisionResolution<Value> {
  isCurrent: () => boolean;
  valuePromise: Promise<Value>;
}

export const resolveCurrentRevisionValue = async <Value>(
  createResolution: () => CurrentRevisionResolution<Value> | null,
  createFallbackValue: () => Value,
): Promise<Value> => {
  for (let attempt = 0; attempt < FIBER_CONTEXT_REVISION_MAX_ATTEMPTS; attempt += 1) {
    const resolution = createResolution();
    if (!resolution) return createFallbackValue();
    const value = await resolution.valuePromise;
    if (resolution.isCurrent() || attempt === FIBER_CONTEXT_REVISION_MAX_ATTEMPTS - 1) {
      return value;
    }
  }
  return createFallbackValue();
};
