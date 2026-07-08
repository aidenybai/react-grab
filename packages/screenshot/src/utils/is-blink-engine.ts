// app-region is a Blink-only property (Chromium PWA window dragging); neither
// Gecko nor WebKit recognizes it.
export const isBlinkEngine = (): boolean =>
  typeof CSS !== "undefined" && CSS.supports("-webkit-app-region", "none");
