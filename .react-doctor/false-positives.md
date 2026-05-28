# Known React Doctor false-positive patterns

This file is the institutional memory the bot uses to skip diagnostics that
have already been triaged as false positives. **Edit this file freely** — the
bot reads it each run and treats every pattern below as "do not fix".

If a triage reveals a new FP pattern, append it here with: the rule id, the
shape of the code that triggers it, and a one-line reason. Be specific enough
that future runs can recognize the same pattern, not just the same file.

---

## `react-doctor/no-array-index-as-key` — `Array.from({ length: N }, (_, index) => …)`

The rule's own validation prompt explicitly excludes "static placeholder lists
built from `Array.from({length})` or `new Array(N)`" — but the lint fires
anyway when the callback uses `index` as the key. Surfaced on
`apps/website-v2/components/ui/slider.tsx:46`, where the radix Slider thumb
is rendered N times from `_values.length`. There's no per-item identity to
reach for: the thumbs are positionally identified by index, the list never
reorders or filters (it tracks a fixed-arity value tuple), and React state
is keyed off the parent Slider's controlled value, not the thumb's DOM
identity.

Skip on:

```tsx
Array.from({ length: N }, (_, index) => <X key={index} … />)
new Array(N).map((_, index) => <X key={index} … />)
```
