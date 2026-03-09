import React from "react";
import { createRoot } from "react-dom/client";
import { createApp } from "vue";
import { render } from "solid-js/web";
import { mount } from "svelte";
import { ReactLogoCard } from "./react-logo-card.react.jsx";
import { SolidLogoCard } from "./solid-logo-card.solid.jsx";
import VueLogoCard from "./vue-logo-card.vue";
import SvelteLogoCard from "./svelte-logo-card.svelte";
import "./styles.css";

if (import.meta.env.DEV) {
  import("react-grab").then(({ registerPlugin }) => {
    const sourceBar = document.getElementById("source-bar");

    registerPlugin({
      name: "source-bar",
      hooks: {
        onCopySuccess: async (elements) => {
          if (!sourceBar || elements.length < 1) return;
          const api = window.__REACT_GRAB__;
          if (!api) return;

          const source = await api.getSource(elements[0]);
          const stackContext = await api.getStackContext(elements[0]);

          if (source) {
            const location = source.lineNumber
              ? `${source.filePath}:${source.lineNumber}`
              : source.filePath;

            sourceBar.textContent = source.componentName
              ? `${source.componentName} → ${location}`
              : location;
          } else if (stackContext) {
            sourceBar.textContent = stackContext.replace(/^\n\s*in\s*/, "");
          } else {
            sourceBar.textContent = "";
            sourceBar.classList.remove("source-bar--visible");
            return;
          }

          sourceBar.classList.add("source-bar--visible");
        },
      },
    });
  });
}

const APPLICATION_MOUNT_ELEMENT_ID = "app";
const FRAMEWORK_MOUNT_IDS = {
  react: "react-logo-root",
  vue: "vue-logo-root",
  solid: "solid-logo-root",
  svelte: "svelte-logo-root",
};

const applicationMountElement = document.getElementById(
  APPLICATION_MOUNT_ELEMENT_ID,
);

if (!applicationMountElement) {
  throw new Error("Framework playground root element is missing.");
}

applicationMountElement.innerHTML = `
  <main class="framework-playground">
    <section class="framework-playground__grid">
      <div id="${FRAMEWORK_MOUNT_IDS.react}"></div>
      <div id="${FRAMEWORK_MOUNT_IDS.vue}"></div>
      <div id="${FRAMEWORK_MOUNT_IDS.solid}"></div>
      <div id="${FRAMEWORK_MOUNT_IDS.svelte}"></div>
    </section>
    <div id="source-bar" class="source-bar"></div>
  </main>
`;

const getRequiredMountElement = (mountElementId) => {
  const mountElement = document.getElementById(mountElementId);
  if (!mountElement) {
    throw new Error(`Missing framework mount element: ${mountElementId}`);
  }
  return mountElement;
};

createRoot(getRequiredMountElement(FRAMEWORK_MOUNT_IDS.react)).render(
  React.createElement(ReactLogoCard),
);

createApp(VueLogoCard).mount(getRequiredMountElement(FRAMEWORK_MOUNT_IDS.vue));

render(
  () => SolidLogoCard({}),
  getRequiredMountElement(FRAMEWORK_MOUNT_IDS.solid),
);

mount(SvelteLogoCard, {
  target: getRequiredMountElement(FRAMEWORK_MOUNT_IDS.svelte),
});

