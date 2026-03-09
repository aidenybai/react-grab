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
  import("react-grab");
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
    <header class="framework-playground__header">
      <h1>Framework Playground</h1>
      <p>Select each framework logo and verify source mapping.</p>
    </header>
    <section class="framework-playground__grid">
      <article class="framework-card"><div id="${FRAMEWORK_MOUNT_IDS.react}"></div></article>
      <article class="framework-card"><div id="${FRAMEWORK_MOUNT_IDS.vue}"></div></article>
      <article class="framework-card"><div id="${FRAMEWORK_MOUNT_IDS.solid}"></div></article>
      <article class="framework-card"><div id="${FRAMEWORK_MOUNT_IDS.svelte}"></div></article>
    </section>
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
