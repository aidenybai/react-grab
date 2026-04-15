export const yieldToMainThread = (): Promise<void> => {
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve) => requestIdleCallback(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
};
