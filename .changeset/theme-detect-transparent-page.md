---
"react-grab": patch
---

Fix theme detection mis-classifying an undeclared light page as dark for visitors on a dark OS. A page with no theme marker, no painted background, and the default `color-scheme: normal` renders a white canvas regardless of the OS preference, so detection now treats it as light instead of falling through to `prefers-color-scheme`. The OS preference is only consulted when the page opts into an OS-following `color-scheme` (e.g. `light dark`).
