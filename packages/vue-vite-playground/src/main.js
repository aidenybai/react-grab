import { createApp } from "vue";
import AppRoot from "./app-root.vue";

if (import.meta.env.DEV) {
  import("react-grab");
}

createApp(AppRoot).mount("#app");
