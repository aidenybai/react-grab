export const onIdle = (callback: () => void): void => {
  if ("scheduler" in globalThis) {
    (
      globalThis as unknown as {
        scheduler: {
          postTask: (cb: () => void, opts: { priority: string }) => void;
        };
      }
    ).scheduler.postTask(callback, {
      priority: "background",
    });
    return;
  }
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    requestIdleCallback(callback);
    return;
  }
  setTimeout(callback, 0);
};
