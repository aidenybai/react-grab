# @react-grab/storybook

Visual playground for React Grab's overlay system - renders the full `ReactGrabRenderer` on a sample page with Storybook controls for every user-facing state.

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
│   ├── main.ts                 ← Storybook config
│   └── preview.tsx             ← global parameters & CSS import
└── stories/
    ├── fixtures.ts             ← preset comment items + menu actions
    ├── noop.ts                 ← no-op callback for handlers
    ├── *.stories.tsx           ← Component stories (mock renderer states)
    └── playground/             ← Ad-hoc scenarios with real init() running
        ├── composite-dashboard.stories.tsx
        ├── freeze-demo.stories.tsx
        └── live-updates.stories.tsx
```

## Two kinds of stories

**Component stories** (toolbar, selection-label, context-menu, comments-dropdown, renderer) render the overlay with mocked props. They're single sources of truth for every user-facing state: idle, context menu, comment input, pending dismiss, etc.

**Playground stories** import `react-grab` for its side effect, so `init()` actually runs and hooks into the story DOM. They replace the former `apps/gym` and exist for ad-hoc hover/grab testing against realistic fixtures:

- **Composite Dashboard** - sidebar, metric cards, chart, and data table for dense-DOM selection testing
- **Freeze Demo** - bouncing animated timer for verifying freeze-animations + freeze-updates
- **Live Updates** - continuously re-rendering components for freeze-updates verification
