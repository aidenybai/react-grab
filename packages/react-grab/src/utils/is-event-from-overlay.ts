export const isEventFromOverlay = (event: Event, attribute: string): boolean => {
  try {
    return event
      .composedPath()
      .some((target) => target instanceof HTMLElement && target.hasAttribute(attribute));
  } catch {
    return false;
  }
};

const IGNORED_OVERLAY_ATTR = "data-react-grab-ignore-events";

/**
 * Returns true when the event originated from inside an overlay subtree
 * tagged with `data-react-grab-ignore-events` — the overlay's "swallow
 * this event" opt-out. This is the most common usage of
 * `isEventFromOverlay` (8+ inline callsites) so the bound helper is
 * worth one less repeated string literal per use.
 */
export const isEventFromIgnoredOverlay = (event: Event): boolean =>
  isEventFromOverlay(event, IGNORED_OVERLAY_ATTR);
