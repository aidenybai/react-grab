import { describe, expect, it, afterEach } from "vite-plus/test";
import { isTelemetryEnabled } from "../src/utils/is-telemetry-enabled.js";

const originalDoNotTrack = process.env.DO_NOT_TRACK;

afterEach(() => {
  if (originalDoNotTrack === undefined) {
    delete process.env.DO_NOT_TRACK;
  } else {
    process.env.DO_NOT_TRACK = originalDoNotTrack;
  }
});

describe("isTelemetryEnabled", () => {
  it("is enabled when DO_NOT_TRACK is unset", () => {
    delete process.env.DO_NOT_TRACK;
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("is disabled when DO_NOT_TRACK is 1", () => {
    process.env.DO_NOT_TRACK = "1";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("is disabled when DO_NOT_TRACK is true", () => {
    process.env.DO_NOT_TRACK = "true";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("stays enabled for explicit opt-in values", () => {
    for (const optInValue of ["0", "false", ""]) {
      process.env.DO_NOT_TRACK = optInValue;
      expect(isTelemetryEnabled()).toBe(true);
    }
  });
});
