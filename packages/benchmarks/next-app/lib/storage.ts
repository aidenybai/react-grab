function isLocalStorageAvailable(): boolean {
  try {
    const key = "__storage_test__";
    window.localStorage.setItem(key, key);
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const memoryStore = new Map<string, string>();

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = isLocalStorageAvailable()
        ? localStorage.getItem(key)
        : (memoryStore.get(key) ?? null);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      const raw = JSON.stringify(value);
      if (isLocalStorageAvailable()) {
        localStorage.setItem(key, raw);
      } else {
        memoryStore.set(key, raw);
      }
    } catch {}
  },

  remove(key: string): void {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },

  clear(): void {
    if (isLocalStorageAvailable()) {
      localStorage.clear();
    } else {
      memoryStore.clear();
    }
  },
};

export default storage;
