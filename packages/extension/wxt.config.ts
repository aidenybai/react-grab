import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import babel from "vite-plugin-babel";

/**
 * @see https://wxt.dev/api/config.html
 * @description WXT configuration for the React Grab extension
 */
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [
      tailwindcss(),
      babel({
        babelConfig: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
    ],
  }),
  manifest: {
    name: "React Grab",
    description: "Grab any element on any website and give it to AI coding agents",
    permissions: ["activeTab", "storage", "clipboardWrite"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["main-world.js"],
        matches: ["<all_urls>"],
      },
    ],
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "128": "icon/128.png",
    },
    action: {
      default_title: "React Grab",
      default_popup: "popup.html",
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png",
      },
    },
    commands: {
      "toggle-grab": {
        suggested_key: {
          default: "Ctrl+Shift+G",
          mac: "Command+Shift+G",
        },
        description: "Toggle React Grab mode",
      },
    },
  },
});
