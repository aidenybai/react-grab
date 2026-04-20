# @react-grab/storybook

Visual playground for React Grab's overlay system — renders the full `ReactGrabRenderer` on a sample page with Storybook controls for every user-facing state.

Uses [Storybook 10](https://storybook.js.org/) with [`storybook-solidjs-vite`](https://github.com/nicolo-ribaudo/storybook-solidjs-vite).

## Develop

```bash
# Build the core CSS once (required before first run)
pnpm --filter react-grab prebuild

# Start Storybook
pnpm --filter @react-grab/storybook dev
```

Opens at `http://localhost:6006`.

## Build

```bash
pnpm --filter @react-grab/storybook build
```

Static build output is written to `storybook-static/`.

## Structure

```
apps/storybook/
├── .storybook/
│   ├── main.ts               ← Storybook config
│   └── preview.tsx           ← global parameters & CSS import
└── stories/
    ├── constants.ts          ← shared magic numbers (ms, px)
    ├── fixtures.ts           ← preset comment items + menu actions
    ├── noop.ts               ← no-op callback for handlers
    └── renderer.stories.tsx  ← single source of truth
```

The renderer story renders the full overlay system (selection label, toolbar, context menu, comments dropdown) on a sample page. Named stories map to real user-facing states: idle, context menu, comment input, pending dismiss, etc.
