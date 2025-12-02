// NOTE: Add `data-react-grab-toolbar` attribute to elements that should be ignored by global event handlers
export const isEventFromOverlay = (event: Event, attribute: string) =>
  event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement && target.hasAttribute(attribute),
    );
