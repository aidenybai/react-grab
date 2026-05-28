# Known React Doctor false-positive patterns

This file is the institutional memory the bot uses to skip diagnostics that
have already been triaged as false positives. **Edit this file freely** — the
bot reads it each run and treats every pattern below as "do not fix".

If a triage reveals a new FP pattern, append it here with: the rule id, the
shape of the code that triggers it, and a one-line reason. Be specific enough
that future runs can recognize the same pattern, not just the same file.

---

## `react-doctor/no-array-index-as-key` — opaque splat of `string | ReactNode`

The rule's validation prompt carves out "append-only logs whose rows have no
per-item identity and never reorder or filter." That covers the
shape where a component receives `content: Array<string | ReactNode>` and
splat-renders it in order: there is no field on a raw string to key off,
the order is intrinsically meaningful, and the array never reorders or
filters. Surfaced on `apps/website/components/blocks/streaming-text.tsx:77,86,91`,
where `content.map((item, index) => …)` returns `<FadeIn key={\`text-${index}\`}>`
or `<span key={\`node-${index}\`}>` depending on the item shape.

Skip on:

```tsx
content.map((item, index) => (
  // item is string | ReactNode (no field to key off)
  <X key={`prefix-${index}`}>{item}</X>
));
```
