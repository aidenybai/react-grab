# react-grab

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
