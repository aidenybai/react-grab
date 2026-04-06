const THIRD_PARTY_PRIVACY_ATTRIBUTES: ReadonlyArray<[string, string]> = [
  // rrweb (PostHog, Highlight, etc.)
  ["data-rr-block", ""],
  ["data-rr-ignore", ""],
  ["data-rr-mask", ""],
  // Sentry
  ["data-sentry-block", ""],
  ["data-sentry-ignore", ""],
  ["data-sentry-mask", ""],
  // Datadog
  ["data-dd-privacy", "hidden"],
  // FullStory
  ["data-fs-exclude", ""],
  // LogRocket
  ["data-lr-exclude", ""],
  // Hotjar
  ["data-hj-suppress", ""],
  // Smartlook
  ["data-recording-disable", ""],
  // Microsoft Clarity
  ["data-clarity-mask", "true"],
  // Heap
  ["data-heap-redact-text", ""],
];

export const hideFromThirdParties = (element: Element): void => {
  for (const [attributeName, attributeValue] of THIRD_PARTY_PRIVACY_ATTRIBUTES) {
    element.setAttribute(attributeName, attributeValue);
  }
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("data-testid", "react-grab-overlay");
  element.classList.add("ph-no-capture");
};
