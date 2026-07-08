import type { FifoCache } from "../types";

export const createFifoCache = <Value>(capacity: number): FifoCache<Value> => {
  const entries = new Map<string, Value>();
  return {
    get: (key) => entries.get(key),
    set: (key, value) => {
      if (!entries.has(key) && entries.size >= capacity) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey !== undefined) entries.delete(oldestKey);
      }
      entries.set(key, value);
    },
    delete: (key) => {
      entries.delete(key);
    },
  };
};
