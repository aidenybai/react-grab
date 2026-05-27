# @react-grab/oxlint-plugin-solid

Internal vendor of [`oxlint-plugin-solidjs`](https://www.npmjs.com/package/oxlint-plugin-solidjs), itself a port of [`eslint-plugin-solid`](https://github.com/solidjs-community/eslint-plugin-solid) to oxlint's JS plugin API.

The upstream `oxlint-plugin-solidjs` package ships only a single bundled `dist/index.js` with no TypeScript source. This package splits that bundle back into per-rule TypeScript files so the implementation lives inside this repo, can be reviewed alongside the rest of the codebase, and is built locally instead of pulled from npm. Behavior is intended to be 1:1 with the original `oxlint-plugin-solidjs@0.1.1`.

The plugin is registered in the root `vite.config.ts` under `lint.jsPlugins` with the alias `solid`, and the recommended ruleset is enabled in an override for `packages/react-grab/src/**/*.{ts,tsx}`.
