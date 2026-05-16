type EventHandlerMap<TEventMap> = {
  readonly [EventType in keyof TEventMap]?: (event: TEventMap[EventType]) => void;
};

export const createEventListener = <TEventMap>(
  handlers: EventHandlerMap<TEventMap>,
): EventListenerObject => {
  const dispatchByEventType = handlers as Record<string, ((event: Event) => void) | undefined>;
  return {
    handleEvent(event) {
      dispatchByEventType[event.type]?.(event);
    },
  };
};
