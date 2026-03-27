## General Rules

- MUST: Use @antfu/ni. Use `ni` to install, `nr SCRIPT_NAME` to run. `nun` to uninstall.
- MUST: Use TypeScript interfaces over types.
- MUST: Keep all types in the global scope.
- MUST: Use arrow functions over function declarations
- MUST: Never comment unless absolutely necessary.
  - If the code is a hack (like a setTimeout or potentially confusing code), it must be prefixed with // HACK: reason for hack
  - Do not delete descriptive comments >3 lines without confirming with the user
- MUST: Use kebab-case for files
- MUST: Use descriptive names for variables (avoid shorthands, or 1-2 character names).
  - Example: for .map(), you can use `innerX` instead of `x`
  - Example: instead of `moved` use `didPositionChange`
- MUST: Frequently re-evaluate and refactor variable names to be more accurate and descriptive.
- MUST: Do not type cast ("as") unless absolutely necessary
- MUST: Remove unused code and don't repeat yourself.
- MUST: Always search the codebase, think of many solutions, then implement the most _elegant_ solution.
- MUST: Put all magic numbers in `constants.ts` using `SCREAMING_SNAKE_CASE` with unit suffixes (`_MS`, `_PX`).
- MUST: Put small, focused utility functions in `utils/` with one utility per file.
- MUST: Use Boolean over !!.

## SolidJS Rules

### Mental Model

- MUST: Treat components as setup functions that run ONCE, not render functions.
- MUST: Place reactive work in primitives (`createMemo`, `createEffect`, `<Show>`, `<For>`), not component body.
- MUST: Access signals only inside reactive contexts (JSX expressions, effects, memos).

### Reactivity

- MUST: Call signals as functions: `count()` not `count`.
- MUST: Use functional updates when new state depends on old: `setCount((prev) => prev + 1)`.
- MUST: Keep signals atomic (one per value):one big state object loses granularity.
- MUST: Use derived functions `() => count() * 2` for cheap/infrequent derivations.
- MUST: Use `createMemo(() => ...)` for expensive/frequent derivations:caches result.
- MUST: Use `createEffect` for side effects only (DOM, localStorage, subscriptions).
- MUST: Call `onCleanup(() => ...)` inside effects for subscriptions/intervals/listeners.
- MUST: Use path syntax for store updates: `setStore("users", 0, "name", "Jane")`.
- MUST: Wrap store props in arrow for `on()`: `on(() => store.value, fn)` not `on(store.value, fn)`.
- SHOULD: Use `{ equals: false }` for trigger signals that always notify.
- SHOULD: Use `batch(() => { ... })` when updating multiple signals outside event handlers.
- SHOULD: Use `on(dep, fn)` for explicit effect dependencies.
- SHOULD: Use `untrack(() => value())` to read without subscribing.
- SHOULD: Use `createStore({ ... })` for nested objects with fine-grained reactivity.
- SHOULD: Use `produce(draft => { ... })` for complex store mutations.
- NEVER: Derive state via `createEffect(() => setX(y()))`:use memo or derived function.
- NEVER: Place side effects inside `createMemo`:causes infinite loops/crashes.

### Effect Taxonomy

Before writing `createEffect`, classify the work and pick the right primitive:

- MUST: Use `createMemo` when the result is pure derived state from other signals/stores. If no external system is touched, it is not an effect.
- MUST: Use event handlers and direct action calls when work happens because a user clicked, selected, or navigated. Do not watch a flag/token in an effect to trigger imperative logic.
- MUST: Use `onMount`/`onCleanup` for one-time lifecycle setup and teardown (subscriptions, timers, imperative DOM wiring) that should not rerun for reactive changes.
- MUST: Keep `createEffect` single-purpose:one effect, one external bridge. Split mixed-responsibility effects.
- SHOULD: Use keyed ownership boundaries (keyed `<Show>`/`<For>`, or keyed `createRoot`) when local state should reset because an identity changed. Do not write a "watch key, clear state" effect.
- SHOULD: Normalize state at the write boundary, not via a repair effect that rewrites after the fact.
- NEVER: Use `createEffect` just to copy one store/signal into another:find the single source of truth.
- NEVER: Use `createEffect` as an event bus (watching a trigger signal to run a command). Call the action directly from the event source.

### Props

- MUST: Access props via `props.title`, not destructuring.
- SHOULD: Wrap in getter if needed: `const title = () => props.title`.
- SHOULD: Use `splitProps(props, ["keys"])` to separate local from pass-through props.
- SHOULD: Use `mergeProps(defaults, props)` for default values.
- SHOULD: Use `children(() => props.children)` only when transforming, otherwise `{props.children}`.
- NEVER: Destructure props `({ title })`:breaks reactivity.

### Control Flow

- MUST: Use `<For each={items()}>` for object arrays:item is value, index is signal.
- MUST: Use `<Index each={items()}>` for primitives/inputs:item is signal, index is number.
- MUST: Use `<Suspense fallback={...}>` for async, not `<Show when={!loading}>`.
- MUST: Access resource states via `data()`, `data.loading`, `data.error`, `data.latest`.
- SHOULD: Use `<Show when={cond()} fallback={...}>` for conditionals.
- SHOULD: Use `<Show when={val}>` callback for type narrowing: `{(v) => <div>{v().name}</div>}`.
- SHOULD: Use `<Switch>/<Match>` for multiple conditions.
- SHOULD: Use `createResource(source, fetcher)` for reactive async data.
- SHOULD: Use `<ErrorBoundary fallback={(err, reset) => ...}>` for render errors.
- NEVER: Use `.map()` in JSX:use `<For>` or `<Index>`.
- NEVER: Rely on ErrorBoundary for event handler or setTimeout errors:use try/catch.

### JSX & DOM

- MUST: Use `class` not `className`.
- MUST: Combine static `class="btn"` with reactive `classList={{ active: isActive() }}`.
- MUST: Use `onClick` for delegated events; `on:click` for native (element-level).
- MUST: Condition inside handler since events are not reactive: `onClick={() => props.onClick?.()}`.
- MUST: Read refs in `onMount` or effects:refs connect after render.
- MUST: Call `onCleanup` inside directives for cleanup.
- SHOULD: Use `on:click` for `stopPropagation`, capture, passive, or custom events.
- SHOULD: Use `style={{ color: color(), "--css-var": value() }}` for inline styles.
- SHOULD: Type refs as `let el: HTMLElement | undefined` with guard.
- SHOULD: Use `use:directiveName={accessor}` for reusable DOM behaviors.
- NEVER: Mix reactive `class={x()}` with `classList`.

## Testing

Run dev `packages/cli` with:

```bash
npm_command=exec node packages/cli/dist/cli.js
```

Run checks always before committing with:

```bash
pnpm test # runs e2e tests
pnpm lint
pnpm typecheck # runs type checking
pnpm format
```

## Development instructions

This is a pnpm + Turborepo monorepo (19 packages under `packages/`). No external services (databases, Docker, etc.) are required.

### Build before test

`pnpm build` must complete before `pnpm test` or `pnpm lint`:Turborepo `dependsOn` enforces this, but be aware that `pnpm test` will rebuild if the build cache is cold. After modifying source files, always rebuild before running tests.

### Approved build scripts

The root `package.json` has `pnpm.onlyBuiltDependencies` configured for `@parcel/watcher`, `esbuild`, `sharp`, `spawn-sync`, and `unrs-resolver`. Without this, `pnpm install` silently skips their native builds and downstream packages may fail.

### Playwright

E2E tests (`pnpm test` at root) run Playwright against the `e2e-app` Vite dev server on port 5175 (auto-started by the Playwright config). Chromium must be installed: `npx --prefix packages/react-grab playwright install chromium --with-deps`.

### Key commands reference

See root `package.json` scripts and `CONTRIBUTING.md` for the full list. Quick reference:

- **Install**: `ni` (or `pnpm install`)
- **Build**: `nr build` (or `pnpm build`)
- **Dev watch**: `nr dev` (or `pnpm dev`):watches core packages
- **Test**: `pnpm test`:runs Playwright E2E + Vitest CLI tests
- **Lint**: `pnpm lint`:oxlint on react-grab package
- **Typecheck**: `pnpm typecheck`:tsc on react-grab package
- **Format**: `pnpm format`:oxfmt
- **CLI dev**: `npm_command=exec node packages/cli/dist/cli.js`
- **Test app**: `pnpm --filter @react-grab/e2e-app dev` (port 5175)
