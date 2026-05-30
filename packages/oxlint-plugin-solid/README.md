# @react-grab/oxlint-plugin-solid

Internal vendor of [`oxlint-plugin-solidjs`](https://www.npmjs.com/package/oxlint-plugin-solidjs), itself a port of [`eslint-plugin-solid`](https://github.com/solidjs-community/eslint-plugin-solid) to oxlint's JS plugin API.

The upstream `oxlint-plugin-solidjs` package ships only a single bundled `dist/index.js` with no TypeScript source. This package splits that bundle back into per-rule TypeScript files so the implementation lives inside this repo, can be reviewed alongside the rest of the codebase, and is built locally instead of pulled from npm. Behavior is intended to be 1:1 with the original `oxlint-plugin-solidjs@0.1.1`.

The plugin is registered in the root `vite.config.ts` under `lint.jsPlugins` with the alias `solid`, and the recommended ruleset is enabled in an override for `packages/react-grab/src/**/*.{ts,tsx}`.

## Maintenance policy

Source files under `src/` are intentionally 1:1 with the upstream bundle. The only edits applied are mechanical (var → const, removal of bundler-induced numeric suffixes like `isFunctionNode4` → `isFunctionNode`, default-export wiring, and explicit cross-file imports for utilities). No rule logic has been changed.

This means several known upstream bugs and limitations are inherited as-is — for example:

- `prefer-classlist`: autofix emits `classlist={…}` lowercase instead of `classList={…}`, and the "already has prop" check also uses lowercase. Rule is `off` in the recommended config.
- `imports`: the static specifier list contains a typo, `SplitPrips`, which silently skips that type-import mapping.
- `utils/imports.ts`: the default module regex `/^solid-js(?:\/?|\b)/` is too permissive and can match non-`solid-js` packages.
- `style-prop`: numeric-unit enforcement runs even when the property name cannot be statically resolved (computed keys).
- `no-innerhtml` / `jsx-no-duplicate-props`: whitespace-only JSX text nodes are counted as real children.
- `prefer-for`: autofix uses `node.parent` directly, which is wrong for `ChainExpression` (optional chaining) ranges.
- `no-unknown-namespaces`: `JSXMemberExpression` component tags are missed.
- `no-react-deps`: namespace-imported `createEffect`/`createMemo` (`Solid.createEffect`) are missed.
- `components-return-once`: IIFE callees are not filtered; concise-body arrows with conditional/logical returns are skipped.
- `no-destructure`: over-reports on any JSX-returning function with a destructured single parameter; the fixer only rewrites read references.
- `reactivity`: sync-callback detection requires exactly one argument, missing array-method callbacks that take an index.
- `utils/trace.ts` / `jsx-no-undef` / `jsx-no-script-url`: identifier lookup is restricted to the current scope, so aliases in parent scopes are not traced.
- `event-handlers` / `jsx-no-script-url`: recursive static-value resolution lacks cycle detection.
- `jsx-uses-vars`: marks lowercase intrinsic JSX tags as "used", which can hide unused-variable diagnostics.

If any of these starts to bite react-grab in practice, patch the affected file and note the divergence here. Until then, the vendor stays faithful to upstream so future syncs are mechanical.
