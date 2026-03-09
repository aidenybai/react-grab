type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends PlainObject>(...sources: Partial<T>[]): T {
  const result: PlainObject = {};

  for (const source of sources) {
    if (!isPlainObject(source)) continue;

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(
          targetValue as PlainObject,
          sourceValue as PlainObject,
        );
      } else if (Array.isArray(sourceValue)) {
        result[key] = [...sourceValue];
      } else {
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}

export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(deepClone) as T;
  const cloned: PlainObject = {};
  for (const key of Object.keys(value as PlainObject)) {
    cloned[key] = deepClone((value as PlainObject)[key]);
  }
  return cloned as T;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a as PlainObject);
  const keysB = Object.keys(b as PlainObject);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) =>
    deepEqual((a as PlainObject)[key], (b as PlainObject)[key]),
  );
}
