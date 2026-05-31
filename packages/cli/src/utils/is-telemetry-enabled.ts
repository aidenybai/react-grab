export const isTelemetryEnabled = (): boolean => {
  const doNotTrack = process.env.DO_NOT_TRACK;
  return doNotTrack !== "1" && doNotTrack !== "true";
};
