// -webkit-hyphenate-limit-after survives only in WebKit; Blink removed it and
// Gecko never implemented it.
export const isWebKitEngine = (): boolean =>
  typeof CSS !== "undefined" && CSS.supports("-webkit-hyphenate-limit-after", "1");
