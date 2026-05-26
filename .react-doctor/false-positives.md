# Known React Doctor false-positive patterns

This file is the institutional memory the bot uses to skip diagnostics that
have already been triaged as false positives. **Edit this file freely** — the
bot reads it each run and treats every pattern below as "do not fix".

If a triage reveals a new FP pattern, append it here with: the rule id, the
shape of the code that triggers it, and a one-line reason. Be specific enough
that future runs can recognize the same pattern, not just the same file.

---

## `react-doctor/js-set-map-lookups` — array is rebuilt every iteration

Skip when the array passed to `.includes()` / `.indexOf()` is **constructed
inside the loop body** (e.g. `const siblings = Array.from(parent.children)`
followed by `siblings.indexOf(x)`). Total complexity is O(n+k) per iteration,
not O(n) per lookup — there is no opportunity to amortize the lookup with a
`Set`, because the `Set` would have to be rebuilt for every iteration too.

The rule's own validation prompt explicitly calls out "arrays rebuilt per
iteration" as a documented non-target, but the linter pass still fires on
this shape today.

Concrete example: `const siblings = Array.from(parentElement.children); const
siblingIndex = siblings.indexOf(currentElement);` inside the `while
(currentElement)` walk in `packages/react-grab/src/utils/create-element-selector.ts`.
