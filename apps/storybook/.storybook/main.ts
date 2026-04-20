import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineMain } from "storybook-solidjs-vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const storybookRoot = path.resolve(here, "..");
const reactGrabRoot = path.resolve(here, "../../../packages/react-grab");

export default defineMain({
  framework: {
    name: "storybook-solidjs-vite",
    options: {
      docgen: false,
    },
  },
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  core: {
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
    enableCrashReports: false,
  },
  stories: [`${storybookRoot}/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)`],
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, {
      define: {
        "process.env.VERSION": JSON.stringify("[DEV]"),
        "process.env.STORYBOOK_DISABLE_TELEMETRY": JSON.stringify("1"),
      },
      resolve: {
        dedupe: ["solid-js", "solid-js/web"],
      },
      server: {
        fs: {
          allow: [storybookRoot, reactGrabRoot],
        },
      },
    });
  },
});
