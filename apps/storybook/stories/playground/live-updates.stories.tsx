import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { onCleanup, onMount } from "solid-js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import "react-grab";
import { LiveCounter } from "./live-counter.react.js";

const ReactHost = () => {
  let hostElement: HTMLDivElement | undefined;

  onMount(() => {
    if (!hostElement) return;
    const reactRoot: Root = createRoot(hostElement);
    reactRoot.render(createElement(LiveCounter));
    onCleanup(() => reactRoot.unmount());
  });

  return <div ref={hostElement} style={{ "min-height": "100vh" }} />;
};

const meta: Meta = {
  title: "Playground/Live Updates",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A React tree using useState + useEffect that re-renders every 100ms. Mounted inside the Solid storybook shell so freeze-updates (which patches React's dispatcher) actually has React renders to pause.",
      },
    },
  },
  render: () => <ReactHost />,
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
