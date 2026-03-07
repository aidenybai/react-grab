import type { Options } from "../types.js";

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const parseOptionsFromJson = (rawValue: unknown): Partial<Options> | null => {
  if (!isObjectRecord(rawValue)) return null;

  const parsedOptions: Partial<Options> = {};

  if (typeof rawValue.enabled === "boolean") {
    parsedOptions.enabled = rawValue.enabled;
  }
  if (rawValue.activationMode === "toggle" || rawValue.activationMode === "hold") {
    parsedOptions.activationMode = rawValue.activationMode;
  }
  if (
    typeof rawValue.keyHoldDuration === "number" &&
    Number.isFinite(rawValue.keyHoldDuration)
  ) {
    parsedOptions.keyHoldDuration = rawValue.keyHoldDuration;
  }
  if (typeof rawValue.allowActivationInsideInput === "boolean") {
    parsedOptions.allowActivationInsideInput = rawValue.allowActivationInsideInput;
  }
  if (
    typeof rawValue.maxContextLines === "number" &&
    Number.isFinite(rawValue.maxContextLines)
  ) {
    parsedOptions.maxContextLines = rawValue.maxContextLines;
  }
  if (typeof rawValue.activationKey === "string") {
    parsedOptions.activationKey = rawValue.activationKey;
  }
  if (typeof rawValue.freezeReactUpdates === "boolean") {
    parsedOptions.freezeReactUpdates = rawValue.freezeReactUpdates;
  }

  if (Object.keys(parsedOptions).length === 0) return null;
  return parsedOptions;
};

export const getScriptOptions = (): Partial<Options> | null => {
  if (typeof window === "undefined") return null;
  try {
    const currentScript =
      document.currentScript instanceof HTMLScriptElement
        ? document.currentScript
        : null;
    const dataOptions = currentScript?.getAttribute("data-options");
    if (!dataOptions) return null;
    return parseOptionsFromJson(JSON.parse(dataOptions));
  } catch {
    return null;
  }
};
