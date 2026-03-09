import { mount } from "svelte";
import AppRoot from "./app-root.svelte";

if (import.meta.env.DEV) {
  import("react-grab");
}

const mountElement = document.getElementById("app");

if (!mountElement) {
  throw new Error("Missing app mount element");
}

mount(AppRoot, {
  target: mountElement,
});
