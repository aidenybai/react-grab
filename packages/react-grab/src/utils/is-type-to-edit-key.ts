export const isTypeToEditKey = (key: string | null | undefined): boolean =>
  typeof key === "string" && key.length === 1 && /^[a-zA-Z0-9-]$/.test(key);
