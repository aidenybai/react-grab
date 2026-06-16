---
"react-grab": patch
---

Surface the React `key` of the picked element in its copied context. Elements rendered through `.map()` share the same JSX source location, so the source line alone couldn't tell list instances apart. The context now walks the fiber tree to the nearest list-item key (the host element's own key, or the enclosing keyed list-item component's key) and includes it, letting agents disambiguate which mapped instance was selected.
