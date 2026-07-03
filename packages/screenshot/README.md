# @react-grab/screenshot

[![version](https://img.shields.io/npm/v/@react-grab/screenshot?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-grab/screenshot)

Screenshot any DOM node, in the browser, with high fidelity.

Give it an element and get back a pixel-accurate PNG of exactly what the user sees — computed styles, web fonts, images, pseudo-elements, shadow DOM, form state, canvas frames, and scroll positions included. Zero runtime dependencies.

## Install

```bash
npm install @react-grab/screenshot
```

## Usage

```ts
import { captureNode } from "@react-grab/screenshot";

const result = await captureNode(document.querySelector("#card"));

result.width; // CSS px of the capture rect
result.height;

await result.toPngDataUrl(); // "data:image/png;base64,..."
await result.toBlob(); // PNG Blob (e.g. for clipboard or upload)
await result.toCanvas(); // HTMLCanvasElement
await result.toSvgDataUrl(); // the intermediate SVG, before rasterization
```

The IIFE build exposes the same API as `window.ReactGrabScreenshot.captureNode`.

### Options

```ts
captureNode(element, options);
```

| Option            | Type                            | Default                   | Description                                                                                                                                                                                              |
| ----------------- | ------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scale`           | `number`                        | `1`                       | Multiplier applied to the output raster size                                                                                                                                                             |
| `pixelRatio`      | `number`                        | `window.devicePixelRatio` | Device pixel ratio for the output canvas                                                                                                                                                                 |
| `backgroundColor` | `string`                        | `undefined` (inherited)   | Fill color painted behind the capture. When omitted and the target's own background is transparent, the nearest ancestor's background color is used; pass `"transparent"` to force a transparent capture |
| `embedFonts`      | `boolean`                       | `true`                    | Inline used `@font-face` fonts as data URLs                                                                                                                                                              |
| `filterNode`      | `(element: Element) => boolean` | `undefined`               | Return `false` to exclude an element and its subtree                                                                                                                                                     |
| `timeoutMs`       | `number`                        | `8000`                    | Per-resource fetch timeout for images, fonts, `url()`s                                                                                                                                                   |
| `abortSignal`     | `AbortSignal`                   | `undefined`               | Cancels an in-flight capture between pipeline stages; the promise rejects with the signal's abort reason                                                                                                 |

## How It Works

`captureNode` runs a read → clone → inline → rasterize pipeline (see [`src/index.ts`](./src/index.ts)):

1. **Computed-style snapshot.** Walk the composed tree (shadow roots and slot assignment resolved) and snapshot `getComputedStyle` for every element, plus `::before`/`::after` when stylesheets define pseudo rules. Non-painting props (`cursor`, `will-change`, animation longhands, …) are skipped.
2. **Default diffing + class dedup.** Each snapshot is diffed against a per-tag baseline computed in a hidden sandbox iframe, so only non-default declarations survive. Identical style sets collapse into shared generated classes (`rgs-1`, `rgs-2`, …) emitted as a single `<style>` block — original `class` attributes are dropped entirely.
3. **Composed-tree clone.** Deep-clone the element with live state baked in: shadow DOM flattened, `<slot>`s replaced by their assigned nodes, form values/checked/selected reflected as attributes, `<img>` frozen to `currentSrc`, `<canvas>` and `<video>` frames captured via `toDataURL()`, scrolled containers reproduced with a transform wrapper. `<script>`/`<style>` are skipped, same-origin `<iframe>`s are recursively captured and embedded as images, and cross-origin ones become sized placeholders.
4. **Resource + font inlining.** Every external URL — `src` attributes, `background-image`, masks, pseudo `content`, and used `@font-face` sources — is fetched (deduped, timed out, cached across captures) and rewritten to a data URL. Failures degrade to a transparent pixel instead of throwing.
5. **SVG `foreignObject`.** The clone and its stylesheet are serialized into `<svg><foreignObject>`, which browsers render with the real layout engine.
6. **Decode-once rasterization.** The SVG is decoded into a single `<img>` (`await img.decode()` plus a double-rAF settle) shared by every output format, then drawn to a canvas at `scale × pixelRatio` (clamped to 16384px per side).

## Fidelity Testing

Every change runs against a Playwright harness ([`e2e/fidelity.spec.ts`](./e2e/fidelity.spec.ts)) that captures each fixture with `captureNode` **and** with Chromium's native `locator.screenshot()`, then compares the two with `pixelmatch`. The score is `diffPixels / (width × height)`; each fixture has a budget in [`e2e/fixture-manifest.ts`](./e2e/fixture-manifest.ts). A second assertion bounds the mean per-channel delta across the whole image, so uniform color drift below pixelmatch's per-pixel threshold still fails.

The suite holds 136 fixtures: 21 written for this library (gradients, transforms, typography with bundled webfonts, flex/grid, shadows, filters, images, pseudo-elements, form controls, scrolled block/flex/grid containers, shadow DOM, canvas, a kitchen sink, and a ~1460-node stress page), 109 ported from the test suites of snapdom (`snap-`), modern-screenshot (`ms-`), html-to-image (`hti-`), and dom-to-image-more (`dtim-`) — CSS counters, icon sprites, SVG `<use>`/defs, sticky-in-scroll, `::first-letter`, same-origin iframes, srcset, tables, custom elements, and the rest of their visual regression catalogs — plus 6 limitation-workaround fixtures (`lim-`) covering `::marker` styling, indeterminate checkboxes, offscreen lazy images, offscreen `content-visibility: auto`, cross-origin `@font-face` stylesheets, and `position: fixed` inside scrolled pages. 131 fixtures hold the strict 0.005 budget (most score exactly 0 — no pixel differs above pixelmatch's 10% YIQ color threshold); the exceptions are 4 form-control fixtures at 0.05, where native widget chrome legitimately rasterizes differently inside `foreignObject`, and the indeterminate-form fixture ratcheted to 0.008.

Run it yourself:

```bash
npm run build && npm test
```

Scores are written to `test-results/fidelity-scores.json`, with expected/actual/diff PNGs attached to each test.

## Benchmarks

`npm run bench` ([`bench/benchmark.spec.ts`](./bench/benchmark.spec.ts)) compares `captureNode` against snapdom, modern-screenshot, html-to-image, html2canvas, and dom-to-image-more on six fixtures. Cold start is reported as the median of 5 captures taken on separate fresh page loads; warm timings are the median and p95 of 8 subsequent captures in the same page. Every capture is also fidelity-scored against Chromium's native screenshot, so read the speed columns together with the fidelity column — a fast capture that renders the wrong pixels is not comparable to an accurate one. Timings still vary run to run; treat small gaps between libraries as noise rather than a ranking. Results are written to `test-results/bench-results.json`.

## Known Limitations

- **Cross-origin iframes** — their content is unreadable, so iframes render as gray placeholders sized to their box.
- **`backdrop-filter`** — depends on backdrop content outside the capture root, which SVG `foreignObject` cannot see.
- **Transformed roots** — the capture renders the target at its untransformed layout size; the root's own transform and any ancestor transforms are not applied to the output.

## License

MIT
