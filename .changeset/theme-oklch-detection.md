---
"react-grab": patch
---

Make app theme detection (which drives the overlay's inverted theme) more robust:

- Read background luminance through the existing `parseAnyColor` helper so pages whose background is authored with `oklch()` (e.g. Tailwind v4) are no longer mis-detected. Browsers serialize these computed colors in their own color space rather than `rgb()`, so the previous `rgb()`-only luminance heuristic silently failed and fell back to `prefers-color-scheme` — a forced-light page then looked dark to dark-OS visitors.
- Treat a dual `color-scheme` (`light dark` / `dark light`) as "decided by the OS preference / actual paint" instead of blindly trusting the first listed token, which mis-detected dark-OS visitors on sites that opt into both schemes.
- Inspect `<body>` in addition to `<html>` for theme markers (class, `data-theme`/`data-bs-theme`/etc., and presence attributes) so apps that theme the body are detected.
- Fall back from the body background to the root element when the body background is transparent.
