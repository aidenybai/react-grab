---
"react-grab": patch
---

Don't surface a list-item `key` when a JSX spread overrides it. `fiber.key` is the key React resolved at runtime, so `<li key={item.id} {...item}>` (where `item` carries a `key`) and `<li {...item}>` report a value that doesn't match the `key={…}` written at that JSX site, which misleads a consumer trying to locate the picked instance. The key is now confirmed against the element's source before it is surfaced: if a spread follows the `key` attribute (or the key comes entirely from a spread), the hint is dropped; an explicit `key` with no trailing spread is unaffected. When the element's source can't be read the key is still surfaced, so the common spread-free case is unchanged.
