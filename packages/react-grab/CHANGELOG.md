# react-grab

## 0.1.48

### Patch Changes

- bc3a591: Fix the grab hanging on "Grabbing…" when the app saturates the dev server's connection pool. Source resolution (bundle and source-map fetches via bippy, plus Next.js server-frame symbolication) now runs through a concurrency-capped, abortable queue with a timeout, so it no longer queues indefinitely behind the app's own requests. Requires bippy ≥0.5.42 so an aborted source-map fetch no longer poisons bippy's cache and later grabs recover.

  Also fixes:

  - A click immediately after keyboard navigation selecting a stale element instead of the one under the pointer.
  - The page jumping when focus is restored after a grab (focus now restores with `preventScroll`).
  - Being unable to select page content while a modal sets `body { pointer-events: none }` (e.g. Radix), via a hit-test override.

  Plus activation and drag performance: animations freeze via the Web Animations API instead of a universal-selector recalc, activation batches its layout reads before writes, the React-update freeze walks fibers iteratively, and drag de-duplication is O(n·d) instead of O(n²).

- e56fcc1: Style mode now resolves committed values to the project's design tokens when copying. Tokens are derived from the CSS custom properties already defined in the page's cascade, so this works for any library that exposes design tokens as CSS variables (shadcn/ui, Radix, Chakra, MUI, Tailwind v4 `@theme`, Panda, vanilla-extract, …) rather than a single hard-coded framework. When a tweaked color matches a token, or a length matches a token whose name shares the property's family (spacing/size/radius/font-size/…), the copied CSS annotates the declaration with a `/* var(--token) */` hint and the prompt nudges the agent to prefer the token over the raw value.

  Arrow-key stepping in the Style panel now snaps a px property through that token scale (e.g. `←`/`→` walk the spacing tokens) instead of always nudging ±1px. `Shift` keeps the coarse raw step (×10) and `Alt`/`Option` does a fine raw ±1px step — both opt out of snapping so values can land between tokens. A value sitting outside the scale falls back to a raw step so stepping never dead-ends. When a framework exposes spacing as a single base unit instead of discrete tokens (Tailwind v4's `--spacing`), stepping walks that base-unit grid.

  Color tokens are resolved through the browser's own rasterizer, so modern wide-gamut values that `getComputedStyle` returns — `lab()`, `lch()`, `oklab()`, `oklch()`, `color()` — are matched too (these are what Tailwind v4 / shadcn themes compile to), not just hex/rgb/hsl.

- 853ec52: Fix theme detection mis-classifying an undeclared light page as dark for visitors on a dark OS. When a page has no theme marker, no `color-scheme`, and no painted background, detection now derives the real backdrop from the CSS `Canvas` system color instead of guessing from `prefers-color-scheme`. `Canvas` honors the root element's used `color-scheme`, so it stays light under the default `normal` (regardless of the OS) and only tracks the OS preference when the page opts into a dark-capable scheme such as `light dark` - matching exactly what the browser paints behind the page.
  - @react-grab/cli@0.1.48

## 0.1.47

### Patch Changes

- 5407d4e: Surface deeper copy context for wrapper-heavy elements. App-owned shared-UI / design-system frames (files under `components/ui/`, `packages/ui/`, `design-system(s)/`, or `primitives/`, e.g. shadcn's `components/ui` or a monorepo `packages/ui`) are now treated like `node_modules` frames: still shown, but exempt from the compact line budget, so a grabbed wrapper digs through its UI primitives to the meaningful feature source by default. Adds a `maxContextLines` option (also settable via the script `data-options` attribute) to raise the budget further for large apps and agent/edit prompts — restoring the option the CLI already writes.

  Also hardens the trace: a non-finite/negative `maxContextLines` no longer disables the hard line cap (it falls back to the default), and consecutive duplicate trace lines from shared-UI frames are collapsed so the output stays readable.

  - @react-grab/cli@0.1.47

## 0.1.46

### Patch Changes

- b85b9b1: Make app theme detection (which drives the overlay's inverted theme) more robust:
  - Read background luminance through the existing `parseAnyColor` helper so pages whose background is authored with `oklch()` (e.g. Tailwind v4) are no longer mis-detected. Browsers serialize these computed colors in their own color space rather than `rgb()`, so the previous `rgb()`-only luminance heuristic silently failed and fell back to `prefers-color-scheme` — a forced-light page then looked dark to dark-OS visitors.
  - Treat a dual `color-scheme` (`light dark` / `dark light`) as "decided by the OS preference / actual paint" instead of blindly trusting the first listed token, which mis-detected dark-OS visitors on sites that opt into both schemes.
  - Inspect `<body>` in addition to `<html>` for theme markers (class, `data-theme`/`data-bs-theme`/etc., and presence attributes) so apps that theme the body are detected.
  - Fall back from the body background to the root element when the body background is transparent.
  - @react-grab/cli@0.1.46

## 0.1.45

### Patch Changes

- e83406b: Surface the React `key` of the picked element in its copied context. Elements rendered through `.map()` share the same JSX source location, so the source line alone couldn't tell list instances apart. The context now walks the fiber tree to the nearest list-item key (the host element's own key, or the enclosing keyed list-item component's key) and includes it, letting agents disambiguate which mapped instance was selected.
  - @react-grab/cli@0.1.45

## 0.1.44

### Patch Changes

- 816db46: Add a confirmation prompt before showing the skill agent-selection view during install.
- Updated dependencies [816db46]
  - @react-grab/cli@0.1.44

## 0.1.43

### Patch Changes

- d930036: Set up automated npm releases via GitHub Actions using trusted publishing (OIDC).
- Updated dependencies [d930036]
  - @react-grab/cli@0.1.43

## 0.1.42

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.42

## 0.1.41

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.41

## 0.1.40

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.40

## 0.1.39

### Patch Changes

- fix: issues with style
- Updated dependencies
  - @react-grab/cli@0.1.39

## 0.1.38

### Patch Changes

- add style feature
- Updated dependencies
  - @react-grab/cli@0.1.38

## 0.1.37

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.37

## 0.1.36

### Patch Changes

- fix hanging issue
- Updated dependencies
  - @react-grab/cli@0.1.36

## 0.1.35

### Patch Changes

- ui improvement
- Updated dependencies
  - @react-grab/cli@0.1.35

## 0.1.34

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.34

## 0.1.33

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.33

## 0.1.32

### Patch Changes

- fix: perf issues
- Updated dependencies
  - @react-grab/cli@0.1.32

## 0.1.31

### Patch Changes

- fix: solidjs not bundling
- Updated dependencies
  - @react-grab/cli@0.1.31

## 0.1.30

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.30

## 0.1.29

### Patch Changes

- cleanup toolbar
- Updated dependencies
  - @react-grab/cli@0.1.29

## 0.1.28

### Patch Changes

- fix
- Updated dependencies
  - @react-grab/cli@0.1.28

## 0.1.27

### Patch Changes

- fix: install instructions
- Updated dependencies
  - @react-grab/cli@0.1.27

## 0.1.26

### Patch Changes

- fix: minor tweaks
- Updated dependencies
  - @react-grab/cli@0.1.26

## 0.1.25

### Patch Changes

- fix: primtiives
- Updated dependencies
  - @react-grab/cli@0.1.25

## 0.1.24

### Patch Changes

- primitives
- Updated dependencies
  - @react-grab/cli@0.1.24

## 0.1.23

### Patch Changes

- fix: npx command
- Updated dependencies
  - @react-grab/cli@0.1.23

## 0.1.22

### Patch Changes

- fix: freezing

## 0.1.21

### Patch Changes

- fix: up and down selection

## 0.1.20

### Patch Changes

- fix: selection performacne

## 0.1.19

### Patch Changes

- fix: gsap

## 0.1.18

### Patch Changes

- fix: minor issues

## 0.1.17

### Patch Changes

- fix: mcp

## 0.1.16

### Patch Changes

- fix: environment detection

## 0.1.15

### Patch Changes

- fix: animations and ux

## 0.1.14

### Patch Changes

- fix: improve recent UX

## 0.1.13

### Patch Changes

- fix MCP client injection

## 0.1.12

### Patch Changes

- feat: MCP

## 0.1.11

### Patch Changes

- fix: claude code provider

## 0.1.10

### Patch Changes

- feat: cdn in cli

## 0.1.9

### Patch Changes

- fix: startServer not exported in providers

## 0.1.8

### Patch Changes

- fix: providers not detaching

## 0.1.7

### Patch Changes

- fix: react freezing safety

## 0.1.6

### Patch Changes

- fix: compat with React Scan

## 0.1.5

### Patch Changes

- fix: fullscreen inset the root

## 0.1.4

### Patch Changes

- fix: improve cli edge cases

## 0.1.3

### Patch Changes

- fix: @react-grab/utils not publishing

## 0.1.2

### Patch Changes

- fix: packages not being published

## 0.1.1

### Patch Changes

- fix: clicking element after keyboard navigation

## 0.1.0

### Minor Changes

- 81adb50: feat: browser

### Patch Changes

- 81adb50: fix: shell script
- fb2b037: fix: cli
- a3d5a94: fix: cli global install
- 81adb50: feat: react support
- 81adb50: fix: use matching CLI version for prerelease builds
- 616d3e8: fix: prevent form submission during IME composition

  When typing CJK (Chinese, Japanese, Korean) characters using IME, pressing Enter to confirm character selection no longer incorrectly submits the form. Added `event.isComposing` check to skip form submission during active IME composition.

- 81adb50: fix: a11y
- a5e7a6a: fix: optimize loading speed of cli
- 90af3f6: fix: CLI hanging
- 81adb50: fix: shell script
- 78efee2: fix: cli
- 074e593: fix: cli
- 5cd3709: fix: decouple browser out from react-grab
- 54c4867: ui improvements

## 0.1.0-beta.13

### Patch Changes

- 616d3e8: fix: prevent form submission during IME composition

  When typing CJK (Chinese, Japanese, Korean) characters using IME, pressing Enter to confirm character selection no longer incorrectly submits the form. Added `event.isComposing` check to skip form submission during active IME composition.

- ui improvements

## 0.1.0-beta.12

### Patch Changes

- fix: decouple browser out from react-grab

## 0.1.0-beta.11

### Patch Changes

- fix: cli global install

## 0.1.0-beta.10

### Patch Changes

- fix: cli

## 0.1.0-beta.9

### Patch Changes

- fix: cli

## 0.1.0-beta.8

### Patch Changes

- fix: cli

## 0.1.0-beta.7

### Patch Changes

- fix: CLI hanging

## 0.1.0-beta.6

### Patch Changes

- fix: optimize loading speed of cli

## 0.1.0-beta.5

### Patch Changes

- fix: a11y

## 0.1.0-beta.4

### Patch Changes

- feat: react support

## 0.1.0-beta.3

### Patch Changes

- fix: use matching CLI version for prerelease builds

## 0.1.0-beta.2

### Patch Changes

- fix: shell script

## 0.1.0-beta.1

### Patch Changes

- fix: shell script

## 0.1.0-beta.0

### Minor Changes

- feat: browser

## 0.0.98

### Patch Changes

- feat: new state architecture and context menu

## 0.0.97

### Patch Changes

- fix: sourcemap error

## 0.0.96

### Patch Changes

- fix: fiber access timeout handling

## 0.0.95

### Patch Changes

- fix: selecting buttons with disabled states

## 0.0.94

### Patch Changes

- fix: browser crashing on selection bug

## 0.0.93

### Patch Changes

- fix: copying not working

## 0.0.92

### Patch Changes

- refactor: use state machines instead of signals

## 0.0.91

### Patch Changes

- feat: dock

## 0.0.90

### Patch Changes

- fix: check visual edit endpoint

## 0.0.89

### Patch Changes

- fix: many bugfixes

## 0.0.88

### Patch Changes

- fix: deprecation errors

## 0.0.87

### Patch Changes

- feat: visual edits

## 0.0.86

### Patch Changes

- fix: editing

## 0.0.85

### Patch Changes

- fix: check versions on each provider

## 0.0.84

### Patch Changes

- fix: migrate from cross-spawn to execa to fix deprecation issue

## 0.0.83

### Patch Changes

- feat: timings during agent processing

## 0.0.82

### Patch Changes

- fix: agent support

## 0.0.81

### Patch Changes

- feat: codex and gemini support

## 0.0.80

### Patch Changes

- fix: replies and undo

## 0.0.79

### Patch Changes

- fix: claude code exit issue

## 0.0.78

### Patch Changes

- fix: cancel animation

## 0.0.77

### Patch Changes

- fix: new cli proxying

## 0.0.76

### Patch Changes

- feat: allow CLI under react-grab namespace

## 0.0.75

### Patch Changes

- fix: issue with Illegal Invocation on next.js pages

## 0.0.74

### Patch Changes

- fix: updateOptions

## 0.0.73

### Patch Changes

- fix: improve cli

## 0.0.72

### Patch Changes

- fix: shimmer effect

## 0.0.71

### Patch Changes

- fix: ux nits

## 0.0.70

### Patch Changes

- fix: react-grab cli flow when agents is used

## 0.0.69

### Patch Changes

- fix: CLI on script tag

## 0.0.68

### Patch Changes

- feat: opencode and cli installer

## 0.0.67

### Patch Changes

- fix: logs

## 0.0.66

### Patch Changes

- fix: flash animation

## 0.0.65

### Patch Changes

- fix: instrumentation

## 0.0.64

### Patch Changes

- fix: stream resumption

## 0.0.63

### Patch Changes

- fix: x positioning of selection label

## 0.0.62

### Patch Changes

- fix: stream resumption

## 0.0.61

### Patch Changes

- fix: improved installation strategy

## 0.0.60

### Patch Changes

- fix: loading states

## 0.0.59

### Patch Changes

- fix: improve component name

## 0.0.58

### Patch Changes

- fix: issues with stack

## 0.0.57

### Patch Changes

- fix: improvements to UI

## 0.0.56

### Patch Changes

- add Turborepo for monorepo build orchestration

## 0.0.55

### Patch Changes

- add agent session management with abort handling and onAbort callback
- add session progress animation and status display in AgentLabel component
- add tagName and selectionBounds to session management for context
- improve drag-and-drop logic with better bounds calculation for selected elements
- add shimmer effect css animations to selection label
- improve selection handling with frozen element for input submission
- add copied state indicator
- add debounced cursor visibility with SELECTION_CURSOR_SETTLE_DELAY_MS
- add checks for editable elements to prevent cursor updates inside text areas
- add size prop to IconToggle component for customizable dimensions
- improve button placement logic and visibility handling in selection box
- integrate BLUR_DEACTIVATION_THRESHOLD_MS for better activation state handling
- add createLabelInstance function for better label instance tracking
- improve input overlay styling with placeholder text adjustments
- add streaming session handling and logging for session resume operations

## 0.0.54

### Patch Changes

- disable logging by default (log: false)
- add browser extension support
- add script configuration options for minimal instrumentation
- adjust state management and success label handling

## 0.0.53

### Patch Changes

- improve focus state handling

## 0.0.52

### Patch Changes

- improve copy state indicators

## 0.0.51

### Patch Changes

- add detailed jsdoc comments for theme properties
- enhance Theme interface with properties for selection box, cursor, crosshair, and labels

## 0.0.50

### Patch Changes

- add extensibility api for custom integrations
- increase key hold duration from 150ms to 200ms for better detection
- improve element bounds calculation
- add timestamp to version fetch url for cache busting

## 0.0.49

### Patch Changes

- allow rapid re-activation of cmd+c shortcut after use
- prevent default and stop propagation for enter key in cmd+c mode
- improve styling and update dependencies

## 0.0.48

### Patch Changes

- improve version fetching with timestamp parameter

## 0.0.47

### Patch Changes

- use event.code instead of event.key for keyboard layout compatibility (dvorak, azerty, etc.)

## 0.0.46

### Patch Changes

- improve instrumentation checks for non-react projects
- enhance element handling in core functionality
- fix redirect issues

## 0.0.45

### Patch Changes

- improve input element handling and fix enter key deactivation
- enhance clipboard functionality and grabbed box handling
- update drag and auto-scroll constants for smoother interactions

## 0.0.44

### Patch Changes

- add debug logging support

## 0.0.43

### Patch Changes

- fix website implementation issues
- improve hook implementations

## 0.0.42

### Patch Changes

- improve cursor tracking behavior

## 0.0.41

### Patch Changes

- code cleanup and improvements
- improve copy version formatting

## 0.0.40

### Patch Changes

- add text-only copy with markdown conversion using turndown
- make cmd+c higher priority over other handlers
- improve selection opacity handling
- filter out Primitive. elements from instrumentation
- remove prompt input from ReactGrabRenderer
- update selection box styles for improved variant handling
- fix source location detection

## 0.0.39

### Patch Changes

- improve sourcemaps in production builds
- make success notification follow cursor position after grabbing elements

## 0.0.38

### Patch Changes

- add multi-select support
- add browser extension groundwork

## 0.0.37

### Patch Changes

- code cleanup and improvements

## 0.0.36

### Patch Changes

- show progress indicator during copy operation

## 0.0.35

### Patch Changes

- allow activation while cursor is inside input elements

## 0.0.34

### Patch Changes

- improve click-through behavior and cleanup

## 0.0.33

### Patch Changes

- major version rewrite with new crosshair design
- code cleanup and optimizations

## 0.0.32

### Patch Changes

- fix keybind conflict issues
- website integration improvements

## 0.0.31

### Patch Changes

- improve screenshot capture

## 0.0.30

### Patch Changes

- improve instrumentation reliability

## 0.0.29

### Patch Changes

- fix crosshair length calculation

## 0.0.28

### Patch Changes

- add computed styles to grabbed element output

## 0.0.27

### Patch Changes

- improve source location detection

## 0.0.26

### Patch Changes

- improve overall performance

## 0.0.25

### Patch Changes

- add new crosshair design
- code cleanup

## 0.0.24

### Patch Changes

- fix various edge cases

## 0.0.23

### Patch Changes

- version bump

## 0.0.21

### Patch Changes

- refactor codebase structure
- migrate to new architecture

## 0.0.20

### Patch Changes

- fix circular reference handling
- enable grabbing of disabled elements (thanks @aymanch-03)
- refactor event parameter naming in createSelectionOverlay

## 0.0.19

### Patch Changes

- add windows and linux path support
- prevent underlying element click handlers during overlay mode
- improve react devtools compatibility

## 0.0.18

### Patch Changes

- fix owner stack traversal

## 0.0.17

### Patch Changes

- improve sourcemap support

## 0.0.16

### Patch Changes

- improve documentation

## 0.0.15

### Patch Changes

- various ux improvements

## 0.0.14

### Patch Changes

- fix keyboard shortcut handling
