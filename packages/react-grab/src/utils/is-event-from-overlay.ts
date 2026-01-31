export const isEventFromOverlay = (
  event: Event,
  attribute: string,
): boolean => {
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
