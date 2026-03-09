import { render } from "solid-js/web";
import { AppRoot } from "./app-root.jsx";

if (import.meta.env.DEV) {
  import("react-grab");
}

const mountElement = document.getElementById("app");

if (!mountElement) {
  throw new Error("Missing app mount element");
}

render(() => <AppRoot />, mountElement);
