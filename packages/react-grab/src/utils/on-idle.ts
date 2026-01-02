export const onIdle = (callback: () => void) => {
  if ("scheduler" in globalThis) {
    return (
      globalThis as unknown as {
        scheduler: {
          postTask: (cb: () => void, opts: { priority: string }) => void;
        };
      }
    ).scheduler.postTask(callback, {
      priority: "background",
    });
  }
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return requestIdleCallback(callback);
  }
  return setTimeout(callback, 0);
};
