import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "eslint.config.mjs",
      "bundled_*.mjs",
      "*.mjs",
      "*.cjs",
      "*.js",
      "*.json",
      "*.md",
      "bin/cli.js",
    ],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "import/order": "off",
    },
  },
);
