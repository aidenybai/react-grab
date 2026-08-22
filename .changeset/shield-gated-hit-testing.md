---
"react-grab": patch
---

Fix hover lag on large pages by hit-testing behind a pointer shield instead of flipping `pointer-events` on the document root, coalescing scroll re-detection into a frame, and caching visual viewport reads.
