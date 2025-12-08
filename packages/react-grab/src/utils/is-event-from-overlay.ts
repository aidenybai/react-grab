export const isEventFromOverlay = (event: Event, attribute: string) => {
  try {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement && target.hasAttribute(attribute),
      );
  } catch {
    return false;
  }
};
