import type { Options } from "../types.js";
import { normalizeActivationKey } from "./parse-activation-key.js";

export const getScriptOptions = (): Partial<Options> | null => {
  if (typeof window === "undefined") return null;
  try {
    const dataOptions = document.currentScript?.getAttribute("data-options");
    if (!dataOptions) return null;
    const parsed = JSON.parse(dataOptions) as Partial<Options> & {
      activationKey?: string | Options["activationKey"];
    };
    // Normalize activationKey if it's a string (e.g., "Win+K")
    if (parsed.activationKey) {
      const normalized = normalizeActivationKey(parsed.activationKey);
      if (normalized) {
        parsed.activationKey = normalized;
      }
    }
    return parsed;
  } catch {
    return null;
  }
};
