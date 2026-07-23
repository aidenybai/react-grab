---
"react-grab": patch
"grab": patch
---

Ship the accumulated selection, copy, customization, and reliability improvements since 0.1.48:

- Grab elements inside open Shadow DOM roots and same-origin iframes, including nested and transformed frames, while preserving source context, overlays, drag selection, editor navigation, and cleanup behavior.
- Select Three.js and React Three Fiber objects directly from canvas renderers, with component metadata, source context, bounds, CSS extraction, and editing support.
- Add public element-picker primitives for filtered or container-scoped hit testing, safe bounds snapshots, transactional page freezing, and editor navigation. The `grab` alias now exposes its documented `primitives` and stylesheet subpaths too.
- Keep held selections attached to their React fibers across DOM replacements and make copy failures recoverable with Retry and Ok controls. Cancel stale or in-flight copy work, reject empty transformed output, restore hovered copy labels, and isolate plugin, action, and subscriber failures.
- Harden activation, teardown, and host-page recovery. Invalid custom activation keys no longer crash initialization; repeated or failed disposal completes safely; toolbar state survives body replacement; Style previews, animations, pseudo states, pointer behavior, and iframe resources are restored reliably.
- Improve component-name and Solid source resolution, immediate theme updates, dark-mode label contrast, auto-scroll boundary handling, toolbar snapping, and selection rendering performance.
