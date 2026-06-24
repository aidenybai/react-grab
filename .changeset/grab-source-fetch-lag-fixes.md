---
"react-grab": patch
---

Fix the grab hanging on "Grabbing…" when the app saturates the dev server's connection pool. Source resolution (bundle and source-map fetches via bippy, plus Next.js server-frame symbolication) now runs through a concurrency-capped, abortable queue with a timeout, so it no longer queues indefinitely behind the app's own requests. Requires bippy ≥0.5.42 so an aborted source-map fetch no longer poisons bippy's cache and later grabs recover.

Also fixes:

- A click immediately after keyboard navigation selecting a stale element instead of the one under the pointer.
- The page jumping when focus is restored after a grab (focus now restores with `preventScroll`).
- Being unable to select page content while a modal sets `body { pointer-events: none }` (e.g. Radix), via a hit-test override.

Plus activation and drag performance: animations freeze via the Web Animations API instead of a universal-selector recalc, activation batches its layout reads before writes, the React-update freeze walks fibers iteratively, and drag de-duplication is O(n·d) instead of O(n²).
