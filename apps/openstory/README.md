# @react-grab/openstory

Internal playground for React Grab's overlay UI. Local-development only — not deployed.

Renders the full `ReactGrabRenderer` against mocked states and realistic playground pages, so overlay states can be inspected without running the e2e app.

Uses [openstory](https://openstory.dev), a Vite-native CSF 3 alternative to Storybook.

## Develop

```bash
# Build the core CSS once (required before first run)
pnpm --filter react-grab prebuild

# Start openstory
pnpm --filter @react-grab/openstory dev
```

Opens at `http://localhost:6006`.

## Build

```bash
pnpm --filter @react-grab/openstory build
```

Generates the static manifest at `dist/__openstory/manifest.json` plus per-story iframe HTML stubs at `dist/__story/<id>/index.html`. Note: `openstory@0.0.2` does not yet produce a self-contained static bundle — the HTML stubs reference virtual modules that only resolve through the dev server. For now, this app is local-dev only.

## Structure

```
apps/openstory/
├── preview.tsx                 global parameters, decorators, CSS import
├── vite.config.ts              openstory + vite-plugin-solid config
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
