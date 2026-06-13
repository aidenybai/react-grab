// Subscribes to the events that move an element within the viewport — page
// scroll (capture, to catch any scrollable ancestor), window resize, and the
// visual viewport's resize/scroll (pinch-zoom, mobile URL bar). Returns a
// cleanup function. Used by overlays that must stay glued to a tracked element.
export const onViewportChange = (onChange: () => void): (() => void) => {
  window.addEventListener("scroll", onChange, true);
  window.addEventListener("resize", onChange);
  window.visualViewport?.addEventListener("resize", onChange);
  window.visualViewport?.addEventListener("scroll", onChange);
  return () => {
    window.removeEventListener("scroll", onChange, true);
    window.removeEventListener("resize", onChange);
    window.visualViewport?.removeEventListener("resize", onChange);
    window.visualViewport?.removeEventListener("scroll", onChange);
  };
};
