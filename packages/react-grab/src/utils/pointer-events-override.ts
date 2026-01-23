let overrideStyle: HTMLStyleElement | null = null;

export const enablePointerEventsOverride = (): void => {
  if (overrideStyle) return;
  overrideStyle = document.createElement("style");
  overrideStyle.setAttribute("data-react-grab-pointer-override", "");
  overrideStyle.textContent = "* { pointer-events: auto !important; }";
  document.head.appendChild(overrideStyle);
};

export const disablePointerEventsOverride = (): void => {
  overrideStyle?.remove();
  overrideStyle = null;
};
