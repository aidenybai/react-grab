---
"react-grab": patch
---

Fix theme detection mis-classifying an undeclared light page as dark for visitors on a dark OS. When a page has no theme marker, no `color-scheme`, and no painted background, detection now derives the real backdrop from the CSS `Canvas` system color instead of guessing from `prefers-color-scheme`. `Canvas` honors the root element's used `color-scheme`, so it stays light under the default `normal` (regardless of the OS) and only tracks the OS preference when the page opts into a dark-capable scheme such as `light dark` - matching exactly what the browser paints behind the page.
