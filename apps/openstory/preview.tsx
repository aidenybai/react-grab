import type { JSX } from "solid-js";
import "react-grab/dist/styles.css";
import type { Preview } from "openstory/solid";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: "Color scheme for react-grab UI",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "dark", title: "Dark", icon: "moon" },
          { value: "light", title: "Light", icon: "sun" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) => {
      const theme =
        ((context.globals as Record<string, unknown>)["theme"] as string | undefined) ?? "dark";
      const canvasBg = theme === "light" ? "#f0f0f0" : "#1a1a1a";
      const renderStory = Story as () => JSX.Element;
      return (
        <div data-rg-theme={theme} style={{ "min-height": "100vh", background: canvasBg }}>
          {renderStory()}
        </div>
      );
    },
  ],
};

export default preview;
