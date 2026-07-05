# Performance learnings

Durable findings from the optimization loop on the capture pipeline. Numbers are
21-run warm medians on the local fixture harness (Chromium unless stated),
primarily `70-stress` and `71-mega-grid`. Each kept change was verified against
the full 3-engine fidelity suite (412 fixtures × Chromium/WebKit/Firefox).

## Style read pass

- Computed-style memoization across identical-signature elements is the single
  biggest lever (70-stress: 254k → 47k `getPropertyValue` calls). The memo key
  is a descriptor of (tag, class list, style-relevant attributes, inline style)
  interned per parent memo key.
- The active element must be excluded from memo cache read/seed (UA
  :focus-visible styling) but must still _have_ a key, or every descendant
  cascades to unmemoized.
- Animated pages don't need to disable memoization entirely: animated property
  names (from @keyframes + WAAPI keyframes, incl. paused ones) join the
  per-element re-read lane instead. Animated 70-stress: 210 → 95ms.
- A property leaves the per-element lane when no author declaration can make it
  vary within a memo class (absolute-length margins/paddings/insets,
  keyword/length-only transforms). inline-size/block-size derive from
  width/height + writing mode; transform-origin/perspective-origin gate on a
  transform being present; grid-template-\* gate on display:grid.
- Memo-hit style maps use prototype delegation (`Object.create(base)`) instead
  of spreading ~340 shared properties per hit.
- Diffed style maps (base and ::before/::after) are cached per memo key; hits
  only re-apply the per-element lane.
- Direct property access (`style.width`) is not faster than
  `getPropertyValue("width")` in Blink — the resolution cost dominates, not the
  call.

## Clone/build pass

- Solid-style template instantiation: the typical clone is tag + emitted class
  - carried inline text with all source attributes dropped, so one prototype
    element per (tag, class, carry) is built once and stamped with
    `cloneNode(false)`, replacing createElement + setAttribute pairs.
- `getAttributeNames()` avoids materializing lazy Attr nodes, unlike
  NamedNodeMap indexing (buildMs 26.5 → 23.9 on mega-grid).
- Single-text-child fast path: `clone.textContent = text` instead of
  createTextNode + appendChild.
- `createElement` beats `createElementNS` for non-namespaced HTML in Chromium.
- One tag dispatch per element: compute XHTML-ness + localName once and key
  every special-case branch (iframe/canvas/video/img/textarea, form state) off
  that string, instead of repeated namespace+tag helper calls.

## Rasterize/encode

- Rasterization must stay on SVG data URLs — blob URLs taint the canvas in
  Chromium (whatwg/html#10641).
- Minimal-escape SVG data URLs (only `%#\r\n\t`) beat encodeURIComponent ~3× on
  URL size, cutting both string build and Blink's URL decode.
- Chromium's native PNG encode (~90ms at 2400×4800) is a hard floor: toBlob,
  OffscreenCanvas.convertToBlob, and worker encode all measure the same.
- WebKit is different: its native PNG encoder is ~an order of magnitude slower
  than Blink's, and a GPU-backed canvas pays a full flush on `getImageData`
  (627ms on 70-stress). Two-part fix: create the raster canvas with
  `willReadFrequently` (readback 627 → 8ms) and hand-assemble the PNG container
  around native `CompressionStream("deflate")`. WebKit 70-stress warm:
  776 → 442ms.
- In the hand-rolled encoder, the None PNG filter both deflates faster and
  compresses smaller than Sub on flat UI rasters (497KB vs 644KB) — long
  literal runs suit zlib's matcher.
- Firefox's native encoder (47ms) beats the JS CompressionStream path (~114ms);
  keep native there.
- Identical serialized SVG markup fully determines output pixels, so a small
  keyed raster cache (markup + scale/pixelRatio/background) reuses the encoded
  PNG for repeat captures of an unchanged DOM.

## Cold start

- Subset baseline probes + parallel font-embed fetches cut 70-stress cold
  378 → 254ms.
- Settle-frame skipping is safe on WebKit/Gecko when no nested data-URL
  resources exist.

## Cross-cutting

- Region capture: crop inside the SVG (viewBox = region rect) so the engine
  only rasterizes region pixels; hollow out-of-region subtrees before the read
  pass with size-pinned boxes.
- Layout-flushing reads (scrollLeft/scrollTop, getBoundingClientRect) are gated
  to elements that can actually need them; the margin-collapse escape pass
  skips non-block elements and elements without element children up front.
- Keep indirect call sites monomorphic and object shapes stable (V8 hidden
  classes); prefer for-loops and preallocated arrays in the walk.

## Framework research (SolidJS, ivi, Inferno, pretext)

- SolidJS: template cloning (`cloneNode` on a hoisted prototype) transferred
  directly as the clone-prototype cache above. Fine-grained invalidation does
  not transfer: CSS layout is global, so one mutation can shift everything —
  per-element dirty tracking can't skip re-reads safely.
- ivi/Inferno: monomorphic dispatch and flag-based node classification
  transferred as the single tag-dispatch restructure; vnode diffing itself has
  no analog in a one-shot capture.
- pretext (chenglou): validates patterns already in use — two-phase
  prepare/layout split (≈ our persisted memo stores), capability-detected
  per-engine corrections cached outside the hot path (≈ our baseline probes),
  and specialized hot-path variants over generic ones. Its canvas measureText
  approach targets text layout, not capture; no direct code to port.

## Rejected approaches

- CSS Typed OM / cssText bulk reads: slower than per-prop getPropertyValue for
  our property counts.
- Worker/tile-based PNG encode on Chromium: no faster than native toBlob.
- CompressionStream PNG encode on Firefox: slower than native.
- Sub PNG filter on WebKit: slower and larger than None on UI rasters.
- Full-string re-verification of memoized styles: defeats the point; the
  descriptor already proves class identity.
