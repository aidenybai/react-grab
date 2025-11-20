import { createSignal, createEffect, onCleanup, on } from "solid-js";

interface UseFadeInOutOptions {
  visible: boolean | undefined;
  autoFadeOutAfter?: number;
}

export const useFadeInOut = (options: UseFadeInOutOptions) => {
  const [opacity, setOpacity] = createSignal(0);

  createEffect(
    on(
      () => options.visible,
      (isVisible) => {
        if (isVisible !== false) {
          requestAnimationFrame(() => {
            setOpacity(1);
          });
        } else {
          setOpacity(0);
          return;
        }

        if (options.autoFadeOutAfter !== undefined) {
          const fadeOutTimer = setTimeout(() => {
            setOpacity(0);
          }, options.autoFadeOutAfter);

          onCleanup(() => clearTimeout(fadeOutTimer));
        }
      },
    ),
  );

  return opacity;
};
