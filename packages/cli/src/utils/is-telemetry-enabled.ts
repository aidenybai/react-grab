import { CI_ENV_KEYS, TELEMETRY_OPT_OUT_ENV_KEYS } from "./constants.js";

const isTruthy = (rawValue: string | undefined): boolean => {
  if (!rawValue) return false;
  const normalized = rawValue.trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
};

const isOptedOut = (): boolean =>
  TELEMETRY_OPT_OUT_ENV_KEYS.some((key) => isTruthy(process.env[key]));

const isInsideContinuousIntegration = (): boolean =>
  CI_ENV_KEYS.some((key) => isTruthy(process.env[key]));

export const isTelemetryEnabled = (): boolean => !isOptedOut() && !isInsideContinuousIntegration();
