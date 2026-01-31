import { createStyleElement } from "./create-style-element.js";

let overrideStyle: HTMLStyleElement | null = null;

export const enablePointerEventsOverride = (): void => {
  if (overrideStyle) return;
  overrideStyle = createStyleElement(
    "data-react-grab-pointer-override",
    "* { pointer-events: auto !important; }",
  );
};

export const disablePointerEventsOverride = (): void => {
  overrideStyle?.remove();
  overrideStyle = null;
};
