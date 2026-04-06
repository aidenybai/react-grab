// Marks an element as private across all major session replay tools so the
// React Grab overlay, injected styles, and font links don't leak into recordings.
const REPLAY_PRIVACY_ATTRIBUTES: ReadonlyArray<[string, string]> = [
  // rrweb / rrweb-based tools (PostHog, Highlight, etc.)
  ["data-rr-block", ""],
  ["data-rr-ignore", ""],
  ["data-rr-mask", ""],
  // Sentry Session Replay
  ["data-sentry-block", ""],
  ["data-sentry-ignore", ""],
  ["data-sentry-mask", ""],
  // Datadog RUM
  ["data-dd-privacy", "hidden"],
  // FullStory
  ["data-fs-exclude", ""],
  // LogRocket
  ["data-lr-exclude", ""],
  // Hotjar
  ["data-hj-suppress", ""],
  // Smartlook
  ["data-recording-disable", ""],
];

export const markReplayPrivate = (element: Element): void => {
  for (const [attribute, value] of REPLAY_PRIVACY_ATTRIBUTES) {
    element.setAttribute(attribute, value);
  }
};
