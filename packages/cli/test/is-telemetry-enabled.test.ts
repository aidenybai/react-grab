import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { isTelemetryEnabled } from "../src/utils/is-telemetry-enabled.js";
import { CI_ENV_KEYS, TELEMETRY_OPT_OUT_ENV_KEYS } from "../src/utils/constants.js";

const ALL_KEYS = [...CI_ENV_KEYS, ...TELEMETRY_OPT_OUT_ENV_KEYS] as const;
const originalEnv = { ...process.env };

beforeEach(() => {
  for (const key of ALL_KEYS) delete process.env[key];
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("isTelemetryEnabled", () => {
  it("returns true when no opt-out and no CI env vars are set", () => {
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("disables when DISABLE_TELEMETRY=1", () => {
    process.env.DISABLE_TELEMETRY = "1";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("disables when DO_NOT_TRACK=1", () => {
    process.env.DO_NOT_TRACK = "1";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("disables when DISABLE_TELEMETRY=true (case-insensitive)", () => {
    process.env.DISABLE_TELEMETRY = "TRUE";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("does NOT disable when DISABLE_TELEMETRY=0 (treats 0 as falsy)", () => {
    process.env.DISABLE_TELEMETRY = "0";
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("does NOT disable when DISABLE_TELEMETRY=false", () => {
    process.env.DISABLE_TELEMETRY = "false";
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("disables in GITHUB_ACTIONS", () => {
    process.env.GITHUB_ACTIONS = "true";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("disables when CI=1", () => {
    process.env.CI = "1";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("disables when CIRCLECI=true", () => {
    process.env.CIRCLECI = "true";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("ignores empty-string env values", () => {
    process.env.CI = "";
    expect(isTelemetryEnabled()).toBe(true);
  });
});
