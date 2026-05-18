import "react-grab/dist/styles.css";

import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "storybook-solidjs-vite";

export default definePreview({
  addons: [addonDocs(), addonA11y()],
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
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
      const theme = context.globals.theme ?? "dark";
      const canvasBg = theme === "light" ? "#f0f0f0" : "#1a1a1a";
      return (
        <div data-rg-theme={theme} style={{ "min-height": "100vh", background: canvasBg }}>
          <Story />
        </div>
      );
    },
  ],
});
