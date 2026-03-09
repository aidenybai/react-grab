type EventHandler<T = unknown> = (payload: T) => void;

export class EventEmitter<Events extends { [K in keyof Events]: unknown }> {
  private listeners = new Map<keyof Events, Set<EventHandler>>();

  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): void {
    this.listeners.get(event)?.delete(handler as EventHandler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }

  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>,
  ): () => void {
    const wrappedHandler: EventHandler<Events[K]> = (payload) => {
      handler(payload);
      this.off(event, wrappedHandler);
    };
    return this.on(event, wrappedHandler);
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

interface AppEvents {
  "auth:login": { userId: string };
  "auth:logout": undefined;
  "theme:change": { theme: string };
  "notification:new": { id: string; message: string };
  "sidebar:toggle": { open: boolean };
}

export const appEvents = new EventEmitter<AppEvents>();
export default EventEmitter;
