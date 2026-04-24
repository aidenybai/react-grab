---
name: react-grab
description: Use React Grab context from MCP or the clipboard when working on UI code, selected elements, copied components, screenshots, layout bugs, styling issues, or user requests that mention React Grab, grabbed elements, selected UI, x-react-grab, or MCP context.
---

# React Grab

## Quick start

When the user asks about UI code or mentions a selected/grabbed element:

1. Check for a React Grab MCP tool such as `get_element_context`.
2. If the tool exists, call it immediately.
3. If it returns "No context has been submitted yet" or equivalent, poll briefly while the user copies/selects the element with React Grab.
4. Use the returned element context as the primary pointer to files, components, DOM structure, and prompt text.
5. If no React Grab context is available, continue with normal code search and tell the user only if the missing context blocks the task.

React Grab context is clipboard-backed. After a successful MCP read, assume repeated calls may return the same context until the user copies another element or overwrites the clipboard.

## MCP polling behavior

Use this pattern when a task depends on a fresh UI selection:

```txt
- Call get_element_context once.
- If empty, wait about 1 second and retry.
- Stop after roughly 30 seconds or once context is returned.
- Do not keep polling in the background after moving on.
```

Prefer MCP over asking the user to paste copied context manually.

## Clipboard-backed transport

For permissionless React Grab MCP implementations, prefer pull-based clipboard context:

```txt
User copies with React Grab
  -> React Grab writes normal text with an x-react-grab envelope to the clipboard
  -> MCP server reads the clipboard on get_element_context
  -> MCP returns the parsed React Grab context
```

Use `clipboardy` for the portable text clipboard path:

```ts
import clipboard from "clipboardy";

const clipboardText = await clipboard.read();
```

Important: `clipboardy` reads and writes text. React Grab MCP uses the portable text path, so `x-react-grab` is encoded inside the copied text payload with stable markers. If an implementation needs the browser's `application/x-react-grab` clipboard MIME data, use platform-specific clipboard APIs instead.

Recommended text envelope:

```txt
--- x-react-grab ---
{"content":["<button>Save</button>\nin SaveButton at src/save-button.tsx:12:5"],"prompt":"Make this primary"}
--- /x-react-grab ---
```

When parsing clipboard text:

- Prefer the `x-react-grab` envelope when present.
- Validate that parsed JSON has `content: string[]` and optional `prompt: string`.
- Fall back to returning the whole clipboard text only when it clearly looks like React Grab output.
- Avoid returning unrelated clipboard contents.

## Using returned context

Treat React Grab output as a high-signal starting point, not as proof:

- Open the referenced file and verify the component still exists.
- Search nearby if line numbers are stale.
- Use the DOM snippet to identify the element and surrounding component.
- Preserve the user's prompt from the MCP result when planning edits.

If the context points to generated, bundled, or stale code, fall back to repository search by component name, visible text, attributes, and class names.
