# @react-grab/storybook

Internal playground for React Grab's overlay UI.

Storybook renders the full `ReactGrabRenderer` against mocked states and realistic playground pages, so overlay states can be inspected without running the e2e app.

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
│   ├── main.ts                 Storybook config
│   └── preview.tsx             global parameters and CSS import
└── stories/
    ├── fixtures.ts             preset comment items and menu actions
    ├── noop.ts                 no-op callback for handlers
    ├── *.stories.tsx           component stories with mocked renderer states
    └── playground/             scenarios with real init() running
        ├── composite-dashboard.stories.tsx
        ├── freeze-demo.stories.tsx
        └── live-updates.stories.tsx
```

## Two kinds of stories

**Component stories** render toolbar, selection label, context menu, comments dropdown, and renderer states with mocked props. Use these to inspect specific UI states such as idle, context menu, comment input, and pending dismiss.

**Playground stories** import `react-grab` for its side effect, so `init()` runs against the story DOM. Use these for ad-hoc hover and grab testing against realistic fixtures:

- **Composite Dashboard** - sidebar, metric cards, chart, and data table for dense-DOM selection testing
- **Freeze Demo** - bouncing animated timer for verifying freeze-animations + freeze-updates
- **Live Updates** - continuously re-rendering components for freeze-updates verification
