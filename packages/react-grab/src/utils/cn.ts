type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, unknown>;

const resolveValue = (input: ClassValue): string => {
  if (typeof input === "string" || typeof input === "number") {
    return String(input);
  }

  if (!input || typeof input !== "object") {
    return "";
  }

  if (Array.isArray(input)) {
    let result = "";
    for (const item of input) {
      if (!item) continue;
      const resolved = resolveValue(item);
      if (resolved) {
        result = result ? `${result} ${resolved}` : resolved;
      }
    }
    return result;
  }

  let result = "";
  for (const key in input) {
    if (input[key]) {
      result = result ? `${result} ${key}` : key;
    }
  }
  return result;
};

export const cn = (...inputs: ClassValue[]): string => {
  let result = "";
  for (const input of inputs) {
    if (!input) continue;
    const resolved = resolveValue(input);
    if (resolved) {
      result = result ? `${result} ${resolved}` : resolved;
    }
  }
  return result;
};
