let overrideStyle: HTMLStyleElement | null = null;

const getStyleElement = (): HTMLStyleElement => {
  if (!overrideStyle) {
    overrideStyle = document.createElement("style");
    overrideStyle.setAttribute("data-react-grab-pointer-override", "");
    overrideStyle.textContent = "* { pointer-events: auto !important; }";
    overrideStyle.disabled = true;
    document.head.appendChild(overrideStyle);
  }
  return overrideStyle;
};

export const enablePointerEventsOverride = (): void => {
  getStyleElement().disabled = false;
};

export const disablePointerEventsOverride = (): void => {
  if (overrideStyle) {
    overrideStyle.disabled = true;
  }
};
