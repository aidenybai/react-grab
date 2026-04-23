import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { onCleanup, onMount } from "solid-js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import "react-grab";
import { BouncingTimer } from "./bouncing-timer.react.js";

const ReactHost = () => {
  let hostElement: HTMLDivElement | undefined;

  onMount(() => {
    if (!hostElement) return;
    const reactRoot: Root = createRoot(hostElement);
    reactRoot.render(createElement(BouncingTimer));
    onCleanup(() => reactRoot.unmount());
  });

  return <div ref={hostElement} style={{ height: "100vh", width: "100vw" }} />;
};

const meta: Meta = {
  title: "Playground/Freeze Demo",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A React tree (useState + useEffect + setInterval) mounted inside the Solid storybook shell. Replaces the gym /freeze-demo page. Activate react-grab (Alt) - freezeUpdates should pause React's setState batch, freezePseudoStates should pause the color transition, and the whole scene should hold still until release.",
      },
    },
  },
  render: () => <ReactHost />,
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
