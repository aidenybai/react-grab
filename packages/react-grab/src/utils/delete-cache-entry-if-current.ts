export const deleteCacheEntryIfCurrent = <Key extends object, Value>(
  cache: WeakMap<Key, Value>,
  key: Key,
  entry: Value,
): void => {
  if (cache.get(key) === entry) cache.delete(key);
};
