import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "bin/**",
      "eslint.config.mjs",
      "bundled_*.mjs",
      "*.mjs",
      "*.cjs",
      "*.js",
      "*.json",
      "*.md",
    ],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: true,
      },
    },
    rules: {
      "import/order": "off",
    },
  },
);
