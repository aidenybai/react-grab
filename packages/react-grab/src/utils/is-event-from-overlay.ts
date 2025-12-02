export const isEventFromOverlay = (event: Event, attribute: string) =>
  event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement && target.hasAttribute(attribute),
    );
