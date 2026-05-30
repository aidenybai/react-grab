import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{js,ts,tsx}": "vp check --fix",
  },
  lint: {
    ignorePatterns: [
      ".next",
      "dist",
      "build",
      "bundled_*.mjs",
      "bin",
      "packages/oxlint-plugin-solid/src",
    ],
    plugins: ["typescript"],
    jsPlugins: [{ name: "solid", specifier: "@react-grab/oxlint-plugin-solid" }],
    rules: {
      "@typescript-eslint/ban-ts-comment": "error",
      "no-array-constructor": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-extra-non-null-assertion": "error",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-this-alias": "error",
      "@typescript-eslint/no-unnecessary-type-constraint": "error",
      "@typescript-eslint/no-unsafe-declaration-merging": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "no-unused-expressions": "error",
      "no-unused-vars": "error",
      "@typescript-eslint/no-wrapper-object-types": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/prefer-namespace-keyword": "error",
      "@typescript-eslint/triple-slash-reference": "error",
    },
    overrides: [
      {
        files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
        rules: {
          "no-var": "error",
          "prefer-rest-params": "error",
          "prefer-spread": "error",
        },
      },
      {
        files: ["**/*.tsx"],
        rules: {
          "no-unassigned-vars": "off",
        },
      },
      {
        files: ["packages/react-grab/src/**/*.{ts,tsx}"],
        rules: {
          "solid/jsx-no-duplicate-props": "error",
          "solid/jsx-no-undef": "error",
          "solid/jsx-no-script-url": "error",
          "solid/jsx-uses-vars": "off",
          "solid/no-innerhtml": "error",
          "solid/no-unknown-namespaces": "error",
          "solid/self-closing-comp": "warn",
          "solid/components-return-once": "warn",
          "solid/no-destructure": "error",
          "solid/prefer-for": "error",
          "solid/reactivity": [
            "warn",
            {
              customReactiveFunctions: [
                "addWindowListener",
                "addDocumentListener",
                "setTimeout",
                "setInterval",
                "requestAnimationFrame",
                "requestIdleCallback",
                "withSelectionInteractionLock",
              ],
            },
          ],
          "solid/event-handlers": "warn",
          "solid/imports": "warn",
          "solid/style-prop": "warn",
          "solid/no-react-deps": "warn",
          "solid/no-react-specific-props": "warn",
        },
      },
    ],
  },
  fmt: {
    semi: true,
    singleQuote: false,
    ignorePatterns: [
      ".next",
      "node_modules",
      "dist",
      "build",
      "pnpm-lock.yaml",
      "packages/oxlint-plugin-solid/src",
    ],
  },
});
