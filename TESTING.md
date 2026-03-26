# Testing react-grab with expect

[expect](https://expect.dev) is an AI-powered browser testing CLI. It reads your branch changes and generates + runs tests automatically.

## Quick start

```bash
# 1. Start the e2e playground dev server
pnpm --filter @react-grab/e2e-playground dev
# Server runs at http://localhost:5175

# 2. Run expect against your branch changes
npx expect-cli --headed -y --target branch -m "<your prompt here>"
```

## How it works

expect analyzes your branch diff (`--target branch`) and generates browser tests based on a natural language instruction (`-m`). It opens a real browser, interacts with the app, and reports pass/fail.

## CLI flags

| Flag | Description |
|------|-------------|
| `-m "..."` | Natural language instruction for what to test |
| `--headed` | Show the browser window (useful for local debugging) |
| `-y` | Run immediately without confirmation prompt |
| `--target branch` | Test all changes on the current branch vs main |
| `--target unstaged` | Test only unstaged changes |
| `--target changes` | Test staged + unstaged changes (default) |
| `--verbose` | Enable verbose logging |

## Writing test prompts

The `-m` message is a guide for the AI agent — it needs enough context to understand what the feature does, how to interact with it, and what to verify. Think of it as onboarding a QA tester who has never seen react-grab before.

### Prompt structure

A good prompt includes:

1. **What the app is** — react-grab is a browser overlay for inspecting React elements
2. **How to activate it** — hold Meta/Ctrl key for ~200ms, hover to highlight, click to select
3. **What changed** — describe the feature being tested, what's visible in the UI
4. **Test scenarios** — specific steps and expected outcomes

### Example: element properties panel (`feat/inspect-element-properties`)

This branch replaces the inspect stack with an element properties panel. Here's the full prompt used in CI:

```
## What to test

Test the element properties panel feature at http://localhost:5175.

react-grab is a browser overlay tool that lets you inspect React elements.
You activate it by holding the Meta/Ctrl key, then hovering over elements
shows a selection label with the element's tag name and component name.

### How to activate react-grab

1. Hold the Meta key (Cmd on Mac, Ctrl on Linux) for ~200ms to activate the overlay
2. While holding Meta, hover over elements to see the selection highlight
3. Click an element to select it — a selection label appears below it
4. Press arrow keys (Up/Down) to navigate the DOM tree (parent/child)

### What changed in this branch

The old "inspect stack" (a list of ancestor elements you could arrow-navigate through)
has been replaced with an element properties panel that appears below the selection
label when you arrow-navigate. This panel shows:

- Size: width × height in pixels
- CSS Properties: color (with color swatch), background color (with swatch),
  font size + family, margin, padding, display, flex direction, gap, grid columns,
  position, overflow
- className: the element's CSS classes (line-clamped to 3 lines)
- React Props section: props from the nearest React composite fiber (excluding
  children, key, ref, __self, __source, sensitive patterns). Values are formatted
  (strings quoted, functions as "fn()", arrays as "[length]", objects as "{count}")
- Accessibility section: accessible name (aria-label / aria-labelledby / alt),
  role (explicit or implicit), keyboard-focusable indicator (check/X icon)
- Contrast badge: when both foreground color and non-transparent background exist,
  shows the WCAG contrast ratio with AA/AAA pass/fail badges
- Box model overlay: margin regions rendered as semi-transparent overlay around
  the selection, padding regions rendered inside

### Test scenarios

1. Activate react-grab (hold Meta), hover over the "Todo List" heading, click to
   select it, then press ArrowUp to navigate to parent — verify the properties panel
   appears showing size, font info, and class names
2. Select a button element (e.g. "Submit" button in the form section) — navigate
   with arrows and verify the panel shows the button's role as "button" and
   keyboard-focusable as "Yes"
3. Select a text element and check that color swatches appear next to Color and
   Background values
4. Select a table cell and verify the accessibility section shows role "cell"
5. Select an input element and verify it shows role "textbox" and is keyboard-focusable
6. Navigate between elements with arrow keys and verify the panel updates with new
   element properties each time
```

### Writing prompts for other features

Follow the same pattern. Here's a template:

```
## What to test

Test <feature name> at http://localhost:5175.

react-grab is a browser overlay tool that lets you inspect React elements.
You activate it by holding the Meta/Ctrl key, then hovering over elements
shows a selection label with the element's tag name and component name.

### How to activate react-grab

1. Hold the Meta key for ~200ms to activate the overlay
2. While holding Meta, hover over elements to see the selection highlight
3. Click an element to select it
4. <any additional activation steps relevant to your feature>

### What changed

<Describe what the feature does, what UI it adds/changes, what the user sees.
Include specifics: component names, property names, visual indicators, etc.
The more concrete detail, the better the AI can verify correctness.>

### Test scenarios

1. <Step-by-step scenario with expected outcome>
2. <Another scenario>
3. <Edge case>
```

## CI

The `test-expect` GitHub Action (`.github/workflows/test-expect.yml`) runs expect automatically on PRs. It:

1. Installs dependencies and builds all packages
2. Starts the e2e-playground dev server on port 5175
3. Runs `expect-cli` with `--target branch` to test branch changes
4. Fails the action if any test fails, passes if all pass

The prompt is embedded directly in the workflow file — update it when the feature under test changes.

## Tips

- **Be detailed in your prompt** — include how to activate the feature, what UI to expect, and specific verification steps
- **Include diff context** — describe what changed so the agent knows what's new vs. existing behavior
- **Use `--headed` locally** to watch what expect does in the browser
- **Use `--target branch`** in CI to test all branch changes, `--target unstaged` locally for quick iteration
- **The e2e playground** at `packages/e2e-playground` has test components with `data-testid` attributes — expect can see and interact with all of them
