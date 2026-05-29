# Known React Doctor false-positive patterns

This file is the institutional memory the bot uses to skip diagnostics that
have already been triaged as false positives. **Edit this file freely** — the
bot reads it each run and treats every pattern below as "do not fix".

If a triage reveals a new FP pattern, append it here with: the rule id, the
shape of the code that triggers it, and a one-line reason. Be specific enough
that future runs can recognize the same pattern, not just the same file.

---

## `react-doctor/no-danger` — hardcoded SVG template literal in a leaf icon component

**Skip on:** a component whose only return value is a single element with
`dangerouslySetInnerHTML={{ __html: \`<svg …>…</svg>\` }}`, where the template
string is a literal SVG document and every interpolation, if any, is a
non-string-typed prop (numeric `width`/`height`, a typed enum, etc.). No
network response, user input, or consumer-controlled string ever lands in the
markup.

```tsx
// example shape — also matches when the SVG is multiple thousand chars
export const IconFoo = ({ width = 14, height = 14, className = "" }: Props) => (
  <span
    className={`inline-flex ${className}`}
    dangerouslySetInnerHTML={{
      __html: `<svg viewBox="0 0 180 180" width="${width}" height="${height}">…</svg>`,
    }}
  />
);
```

**Why it's wrong:** the rule's own `## Validation prompt` reads "False
positive: HTML that is provably sanitized at the boundary — verify the value
can never carry attacker-controllable input before silencing on a specific
line." A literal template string with only numeric interpolations is the
strongest possible form of "provably sanitized" — there is no attacker
surface at all. The recommended fix (convert to JSX `<svg>` children) is a
hand-conversion exercise of every SVG attribute to camelCase plus inline
`style="…"` strings to JSX `style` objects, with no behavior or perf change
to show for it. Future runs should skip this shape unless an interpolation
of a `string`-typed value appears in the template.
