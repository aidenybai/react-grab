let overrideStyle: HTMLStyleElement | null = null;

export const enablePointerEventsOverride = (): void => {
  if (overrideStyle) return;
  overrideStyle = document.createElement("style");
  overrideStyle.textContent = "* { pointer-events: auto !important; }";
  document.head.appendChild(overrideStyle);
};

export const disablePointerEventsOverride = (): void => {
  if (!overrideStyle) return;
  overrideStyle.remove();
  overrideStyle = null;
};
