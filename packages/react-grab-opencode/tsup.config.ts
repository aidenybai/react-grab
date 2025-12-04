import { defineConfig } from "tsup";

export default defineConfig([
    // Server + CLI build (Node.js)
    {
        entry: {
            server: "./src/server.ts",
            cli: "./src/cli.ts",
        },
        format: ["cjs", "esm"],
        dts: false, // Skip DTS for now due to cross-package type resolution issues
        clean: false,
        splitting: false,
        sourcemap: false,
        target: "node18",
        platform: "node",
        treeshake: true,
        noExternal: [/.*/],
    },
    // Client build (Browser - ESM/CJS)
    {
        entry: {
            client: "./src/client.ts",
        },
        format: ["cjs", "esm"],
        dts: false, // Skip DTS for now
        clean: false,
        splitting: false,
        sourcemap: false,
        target: "esnext",
        platform: "browser",
        treeshake: true,
    },
    // Client build (Browser - IIFE for script tag)
    {
        entry: ["./src/client.ts"],
        format: ["iife"],
        globalName: "ReactGrabOpencode",
        outExtension: () => ({ js: ".global.js" }),
        dts: false,
        clean: false,
        minify: process.env.NODE_ENV === "production",
        splitting: false,
        sourcemap: false,
        target: "esnext",
        platform: "browser",
        treeshake: true,
        noExternal: [/.*/],
    },
]);
