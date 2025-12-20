# SolidJS Rules

## Mental Model

- MUST: Treat components as setup functions that run ONCE, not render functions.
- MUST: Place reactive work in primitives (`createMemo`, `createEffect`, `<Show>`, `<For>`), not component body.
- MUST: Access signals only inside reactive contexts (JSX expressions, effects, memos).

## Reactivity

- MUST: Call signals as functions: `count()` not `count`.
- MUST: Use functional updates when new state depends on old: `setCount((prev) => prev + 1)`.
- MUST: Keep signals atomic (one per value) — one big state object loses granularity.
- MUST: Use derived functions `() => count() * 2` for cheap/infrequent derivations.
- MUST: Use `createMemo(() => ...)` for expensive/frequent derivations — caches result.
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
- NEVER: Derive state via `createEffect(() => setX(y()))` — use memo or derived function.
- NEVER: Place side effects inside `createMemo` — causes infinite loops/crashes.

## Props

- MUST: Access props via `props.title`, not destructuring.
- SHOULD: Wrap in getter if needed: `const title = () => props.title`.
- SHOULD: Use `splitProps(props, ["keys"])` to separate local from pass-through props.
- SHOULD: Use `mergeProps(defaults, props)` for default values.
- SHOULD: Use `children(() => props.children)` only when transforming, otherwise `{props.children}`.
- NEVER: Destructure props `({ title })` — breaks reactivity.

## Control Flow

- MUST: Use `<For each={items()}>` for object arrays — item is value, index is signal.
- MUST: Use `<Index each={items()}>` for primitives/inputs — item is signal, index is number.
- MUST: Use `<Suspense fallback={...}>` for async, not `<Show when={!loading}>`.
- MUST: Access resource states via `data()`, `data.loading`, `data.error`, `data.latest`.
- SHOULD: Use `<Show when={cond()} fallback={...}>` for conditionals.
- SHOULD: Use `<Show when={val}>` callback for type narrowing: `{(v) => <div>{v().name}</div>}`.
- SHOULD: Use `<Switch>/<Match>` for multiple conditions.
- SHOULD: Use `createResource(source, fetcher)` for reactive async data.
- SHOULD: Use `<ErrorBoundary fallback={(err, reset) => ...}>` for render errors.
- NEVER: Use `.map()` in JSX — use `<For>` or `<Index>`.
- NEVER: Rely on ErrorBoundary for event handler or setTimeout errors — use try/catch.

## JSX & DOM

- MUST: Use `class` not `className`.
- MUST: Combine static `class="btn"` with reactive `classList={{ active: isActive() }}`.
- MUST: Use `onClick` for delegated events; `on:click` for native (element-level).
- MUST: Condition inside handler since events are not reactive: `onClick={() => props.onClick?.()}`.
- MUST: Read refs in `onMount` or effects — refs connect after render.
- MUST: Call `onCleanup` inside directives for cleanup.
- SHOULD: Use `on:click` for `stopPropagation`, capture, passive, or custom events.
- SHOULD: Use `style={{ color: color(), "--css-var": value() }}` for inline styles.
- SHOULD: Type refs as `let el: HTMLElement | undefined` with guard.
- SHOULD: Use `use:directiveName={accessor}` for reusable DOM behaviors.
- NEVER: Mix reactive `class={x()}` with `classList`.
