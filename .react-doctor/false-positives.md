# Known React Doctor false-positive patterns

This file is the institutional memory the bot uses to skip diagnostics that
have already been triaged as false positives. **Edit this file freely** — the
bot reads it each run and treats every pattern below as "do not fix".

If a triage reveals a new FP pattern, append it here with: the rule id, the
shape of the code that triggers it, and a one-line reason. Be specific enough
that future runs can recognize the same pattern, not just the same file.

---

## `react-doctor/js-set-map-lookups` — `.includes()` on a string

Skip when the receiver of `.includes()` is a string (string literal, template
literal, `String(x)`, the result of `.toLowerCase()` / `.toUpperCase()` /
`.trim()`, a DOM string prop like `textContent` / `href` / `className`, or any
local string identifier that doesn't match the rule's hard-coded `text|url|html|json`
suffix heuristic). `string.includes(needle)` is an O(needle) substring search,
not the O(n) array membership test the rule is designed to flag — converting
to a `Set` is meaningless.

Concrete example that triggered this: `route.includes("/")` inside the route
loop in `apps/website/app/sitemap.ts`, where `route` is a string but the
identifier name isn't in the rule's skip list.
