# React Grab Changelog Summary (0.0.70 → HEAD)

> Comprehensive changelog based on actual code changes across 28 versions (390 commits)

---

## Unreleased (since 0.0.98)

### Major: Canvas-Based Overlay System
Replaced DOM-based selection boxes and crosshairs with a unified **canvas rendering system**:

- New `overlay-canvas.tsx` component (~860 lines) using `OffscreenCanvas` for performant rendering
- Animated bounds with lerp-based transitions for smooth selection movement
- Layer-based architecture: crosshair, drag, selection, grabbed, processing layers
- Removed `selection-box.tsx` and `crosshair.tsx` DOM components

### Major: Plugin Registry System
New extensibility architecture via `plugin-registry.ts` (~246 lines):

- `register(plugin, api)` / `unregister(name)` for plugin lifecycle
- Plugin hooks: `onActivate`, `onDeactivate`, `onCopy`, `onElementDetected`, etc.
- Plugins can contribute: themes, context menu actions, options
- `setOptions()` for runtime configuration (renamed from `setAgent`)

### Other Changes
- New icon components: `icon-check.tsx`, `icon-stop.tsx`, `icon-submit.tsx`
- Enhanced context menu with screenshot scaling improvements
- Label removal functionality for elements
- Updated idle timeout constant
- Exposed screenshot utilities and types as public exports (#103)

---

## 0.0.98

### Major: State Management Rewrite
Removed xstate dependency, replaced with **SolidJS store-based state machine**:

- New `store.ts` (~770 lines) with fine-grained reactive state
- State phases: `idle` → `holding` → `active` (hovering/frozen/dragging/justDragged) → `copying` → `justCopied`
- Simplified event-driven transitions using SolidJS's `produce`

### Major: Context Menu
New right-click context menu component (`context-menu.tsx`, ~310 lines):

- Actions: Copy, Screenshot, Open (in editor), Edit (with agent)
- Keyboard shortcuts display with `formatShortcut()` utility
- Auto-positioning relative to selection bounds

### Major: Screenshot Capture
Full screenshot support using Screen Capture API:

- `capture-screenshot.ts` using `navigator.mediaDevices.getDisplayMedia()`
- `preferCurrentTab: true` for same-tab capture
- Video frame extraction to canvas for high-DPI support
- `combineBounds()` utility for multi-element screenshots

### Liquid Glass UI
New visual style with frosted glass effects for context menu and toolbar components.

---

## 0.0.97

- Fixed sourcemap errors in production builds

---

## 0.0.96

- Fixed fiber access timeout handling in `getStack()` function for React component detection

---

## 0.0.95

### Testing Infrastructure
- Added e2e test suite with Playwright
- Activation and keyboard handling tests
- GitHub Actions workflow for test reporting

### Code Changes
- `createElementBounds` utility enhanced with transform matrix accumulation
- Agent script injection in transform utility
- CLI spinner feedback utility
- Suppressed http-proxy-middleware deprecation warning

---

## 0.0.94

- Fixed browser crashing bug during element selection (#92)

---

## 0.0.93

- Enhanced auto-scrolling during drag operations
- Improved follow-up input handling in completion view
- Agent manager session handling improvements

---

## 0.0.92

### Major: XState State Machine
Introduced formal state machine architecture (`state/machine.ts`, ~1000 lines):

- States: idle, holding, activating, active (with nested states), copying, justCopied, inputMode
- Events: HOLD_START, RELEASE, ACTIVATE, DEACTIVATE, FREEZE, DRAG_START, COPY_START, INPUT_MODE_ENTER, etc.
- Context with full UI state: mousePosition, dragStart, frozenElement, agentSessions, labelInstances

### Selection Label Refactor
Split monolithic `selection-label.tsx` into focused components:

- `action-pill.tsx` - Copy/edit action buttons
- `arrow.tsx` - Pointer arrow component
- `bottom-section.tsx` - Bottom action bar
- `completion-view.tsx` - Agent completion UI
- `discard-prompt.tsx` - Discard confirmation dialog
- `error-view.tsx` - Error state display
- `tag-badge.tsx` - Element tag display

### Undo/Redo System
- Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
- Agent-level undo stack
- `canUndo` / `canRedo` state tracking

### Follow-up Submissions
- Continue conversation with agent after initial edit
- Button text changed: "Reject" → "Undo", "Accept" → "Keep"

### HTML Diff Generation
- `0b901c5` feat: implement HTML diff generation
- Content diffing for visual edit previews

### Other
- Exposed `styles.css` in package exports (#72)
- CSS optimization with inline CSS features
- Drag with visual edit support (#89)

---

## 0.0.91

### Speech Recognition
- New `IconMic` component with microphone icon
- Integrated speech recognition in selection label
- Toggle listening state with visual feedback

### SVG Handling
- Enhanced SVG stripping in ReactGrabRenderer
- Improved component props handling

### Dock Component
- Renamed from toolbar, enhanced positioning

---

## 0.0.90

- Updated visual-edit API endpoints

---

## 0.0.89

### New Provider: Factory Droid
New `provider-droid` package (~835 lines total):

- `client.ts` (~148 lines) - Droid agent client implementation
- `server.ts` (~392 lines) - Server with message handling
- WebSocket-based communication

### Visual Edit API Hardening
- Rate limiting implementation
- CORS validation improvements
- Character limits for message content
- Client IP address handling

---

## 0.0.88

- HTTPS for script URLs in start command
- Benchmark chart improvements
- Suppressed deprecation warnings

---

## 0.0.87

### Visual Edits Support
Initial visual edit integration:

- Visual edit agent handling
- CORS headers for visual edit API
- Element handling in visual edit operations

---

## 0.0.86

- Minor editing improvements and bug fixes

---

## 0.0.85

### Follow-up Interactions
- Support for continuing conversation after initial agent response
- Dismiss button text customization via `dismissButtonText` option

### Arrow Key Navigation
- Navigate between grabbable elements using arrow keys
- `getSiblingElement()` utility for directional navigation
- Enhanced element filtering logic

### Agent Management
- Agent abort handling with state cleanup
- Activation mode handling improvements
- Native selection state management during viewport updates

### Provider Fixes
- `provider-cursor`: Use `cwd` option instead of `--workspace` flag (#68)
- Undo functionality across multiple providers
- Timeout and status reporting improvements

### CLI Changes
- Renamed `customize` command to `configure`
- Changed `react-grab` to `grab` in installation instructions

---

## 0.0.84

- Migrated from `cross-spawn` to `execa` to fix deprecation issues

---

## 0.0.83

### Agent Processing Timings
- Display timing information during agent operations
- Enhanced user feedback for long-running operations

---

## 0.0.82

- Agent support improvements and bug fixes

---

## 0.0.81

### New Providers: Codex & Gemini

**provider-codex** package (new):
- `client.ts` (~253 lines) - Codex API client with streaming
- `server.ts` (~204 lines) - Server implementation
- SSE-based streaming responses

**provider-gemini** package (new):
- `client.ts` (~253 lines) - Gemini API client with streaming
- `server.ts` (~259 lines) - Server with Gemini-specific handling
- Support for Gemini's conversation format

### Amp Integration
- Added Amp provider support in CLI and documentation

---

## 0.0.80

- Replies and undo functionality improvements
- Claude code exit issue fix

---

## 0.0.78

### Completed Confirmation UI
- New keyboard handling in `CompletedConfirmation` component
- Enter to accept, Escape to reject

### DOM Undo for Instant Apply
- `instant-apply-api` undo functionality for reverting DOM changes
- Critical rules for DOM modification requests

### Package Renaming
Renamed packages for consistency:
- `@react-grab/ami` → `provider-ami`
- `@react-grab/claude-code` → `provider-claude-code`
- `@react-grab/cursor` → `provider-cursor`
- `@react-grab/opencode` → `provider-opencode`

### Other
- Token storage moved to `sessionStorage` for security
- Improved hotkey utility with modifier key checks

---

## 0.0.77

- New CLI proxying implementation

---

## 0.0.76

- CLI available under `react-grab` namespace in addition to `grab`

---

## 0.0.75

- Fixed "Illegal Invocation" error on Next.js pages router

---

## 0.0.74

- `updateOptions` API improvements

---

## 0.0.73

### CLI Improvements
- Installation command changed to `init` (from `install`)
- Standardized boolean conversions across components
- Agent names consistency in initialization

---

## 0.0.72

### Shimmer Animation
- Text shimmer/shiny-text CSS animation effect
- Enhanced visual feedback during operations

### Agent Provider Improvements
- Undo functionality in agent providers
- Improved ancestor context handling
- API endpoint updates

### Build Configuration
- Dynamic version and commit hash injection via tsup

---

## 0.0.71

### Selection Label UX Polish
- Textarea improvements: word wrapping, max-height (95px), hidden scrollbar
- Empty submission prevention (`!props.inputValue?.trim()`)
- Added `select-none` class to prevent text selection on container
- Pointer events conditional on `isInputExpanded` state

### Abort Button Enhancement
- Added `data-react-grab-ignore-events` attribute
- Proper event propagation stopping on all handlers
- `pointer-events-none` on inner icon

### Core Improvements
- Added `BOUNDS_RECALC_INTERVAL_MS` constant for periodic bounds updates
- Enhanced Enter/Escape key handling
- Improved mouse and pointer event handling

### Status Messages
- Changed "Please wait…" to "Thinking…"
- Updated placeholder text variations

---

## 0.0.70

- Fixed CLI flow when agents are used
- Base version for this changelog

---

## Architecture Evolution Summary

| Version | Architecture Change |
|---------|---------------------|
| 0.0.70 | Baseline - SolidJS signals |
| 0.0.92 | + XState state machine |
| 0.0.98 | - XState, + SolidJS store |
| HEAD | + Canvas overlay, + Plugin system |

## Provider Timeline

| Version | Providers Added |
|---------|-----------------|
| 0.0.70 | Claude Code, Cursor, OpenCode, AMI |
| 0.0.81 | + Codex, + Gemini, + Amp |
| 0.0.89 | + Factory Droid |

## Breaking Changes

- **0.0.78**: Packages renamed `@react-grab/*` → `provider-*`
- **0.0.73**: CLI command `install` → `init`
- **0.0.85**: CLI command `customize` → `configure`
- **Unreleased**: API method `setAgent` → `setOptions`
