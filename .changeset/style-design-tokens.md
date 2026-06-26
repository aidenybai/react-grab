---
"react-grab": patch
---

Style mode now resolves committed values to the project's design tokens when copying. Tokens are derived from the CSS custom properties already defined in the page's cascade, so this works for any library that exposes design tokens as CSS variables (shadcn/ui, Radix, Chakra, MUI, Tailwind v4 `@theme`, Panda, vanilla-extract, …) rather than a single hard-coded framework. When a tweaked color matches a token, or a length matches a token whose name shares the property's family (spacing/size/radius/font-size/…), the copied CSS annotates the declaration with a `/* var(--token) */` hint and the prompt nudges the agent to prefer the token over the raw value.

Arrow-key stepping in the Style panel now snaps a px property through that token scale (e.g. `←`/`→` walk the spacing tokens) instead of always nudging ±1px. Shift keeps the coarse raw step, and a value sitting outside the scale falls back to a raw step so stepping never dead-ends. When a framework exposes spacing as a single base unit instead of discrete tokens (Tailwind v4's `--spacing`), stepping walks that base-unit grid.

Color tokens are resolved through the browser's own rasterizer, so modern wide-gamut values that `getComputedStyle` returns — `lab()`, `lch()`, `oklab()`, `oklch()`, `color()` — are matched too (these are what Tailwind v4 / shadcn themes compile to), not just hex/rgb/hsl.
