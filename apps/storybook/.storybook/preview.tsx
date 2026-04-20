import "react-grab/dist/styles.css";

import addonA11y from "@storybook/addon-a11y";
import addonDocs from "@storybook/addon-docs";
import { createJSXDecorator, definePreview } from "storybook-solidjs-vite";

const canvasDecorator = createJSXDecorator((Story) => (
  <div
    style={{
      "min-height": "100vh",
      background: "#fafafa",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}
  >
    {Story()}
  </div>
));

export default definePreview({
  addons: [addonDocs(), addonA11y()],
  decorators: [canvasDecorator],
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
});
