import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import solid from "vite-plugin-solid";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const REACT_COMPONENT_INCLUDE_PATTERN = /\.react\.jsx$/;
const SOLID_COMPONENT_INCLUDE_PATTERN = /\.solid\.jsx$/;

export default defineConfig({
  plugins: [
    react({
      include: REACT_COMPONENT_INCLUDE_PATTERN,
    }),
    solid({
      include: SOLID_COMPONENT_INCLUDE_PATTERN,
    }),
    vue(),
    svelte(),
  ],
});
