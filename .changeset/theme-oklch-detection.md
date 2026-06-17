---
"react-grab": patch
---

Fix app theme detection misreading pages whose background is authored with modern color functions (`oklch()`, `oklab()`, `color()`). Browsers serialize these computed colors in their own color space rather than `rgb()`, so the luminance heuristic failed and fell back to `prefers-color-scheme` — causing a light page to be treated as dark (and the overlay inverted) for visitors on a dark OS. Background colors are now normalized through the browser's own color parser, and the root element is used as a fallback when the body background is transparent.
