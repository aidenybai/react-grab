---
"react-grab": patch
---

Surface deeper copy context for wrapper-heavy elements. App-owned shared-UI / design-system frames (files under `components/ui/`, `packages/ui/`, `design-system(s)/`, or `primitives/`, e.g. shadcn's `components/ui` or a monorepo `packages/ui`) are now treated like `node_modules` frames: still shown, but exempt from the compact line budget, so a grabbed wrapper digs through its UI primitives to the meaningful feature source by default. Adds a `maxContextLines` option (also settable via the script `data-options` attribute) to raise the budget further for large apps and agent/edit prompts — restoring the option the CLI already writes.

Also hardens the trace: a non-finite/negative `maxContextLines` no longer disables the hard line cap (it falls back to the default), and consecutive duplicate trace lines from shared-UI frames are collapsed so the output stays readable.
