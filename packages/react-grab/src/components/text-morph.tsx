import { onMount, onCleanup, createEffect } from "solid-js";
import type { Component } from "solid-js";
import { TextMorph as TorphTextMorph } from "torph";

interface TextMorphProps {
  children: string;
}

export const TextMorph: Component<TextMorphProps> = (props) => {
  let spanRef: HTMLSpanElement | undefined;
  let morphInstance: TorphTextMorph | undefined;

  onMount(() => {
    if (!spanRef) return;
    morphInstance = new TorphTextMorph({
      element: spanRef,
      duration: 300,
    });
    morphInstance.update(props.children);
  });

  createEffect(() => {
    const text = props.children;
    morphInstance?.update(text);
  });

  onCleanup(() => {
    morphInstance?.destroy();
  });

  return <span ref={spanRef} />;
};
