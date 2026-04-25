---
name: react-grab
description: >-
  Pull the latest UI element grabbed via React Grab from the user's clipboard.
  Use when the user references a grabbed element, "this thing", "the component
  I just clicked", "the element I selected", or pastes/cites content that came
  from React Grab's toolbar.
---

# React Grab Mode

When the user references an element they grabbed with React Grab (phrases like "this thing", "the component I just clicked", "the element I grabbed", or when they've clearly pasted React Grab output), the **canonical description of that element lives in the system clipboard** under the custom MIME type `application/x-react-grab`.

## What to do

1. **Before doing anything else**, call the `get_element_context` tool from the `react-grab-mcp` MCP server **exactly once** at the top of the turn.
2. Treat its return value as the authoritative description of the target element. It contains:
   - The user's prompt (if they typed one in the toolbar).
   - The HTML snippet of the selected element(s).
   - Component stack / source file paths.
3. Plan and execute the user's request against that returned context.

## Failure modes

- **`get_element_context` tool isn't registered with your MCP client** — React Grab MCP isn't installed. Tell the user to run `npx @react-grab/cli@latest install-mcp` and restart their MCP client.
- **"No React Grab context found on the clipboard."** — the clipboard either doesn't hold a React Grab payload or it's older than the TTL. Tell the user: _"I don't see a recent grab. Click the element in the React Grab toolbar (the box that appears when you hover the page) and try again."_ Do not retry the tool inside the same turn.
- **"Clipboard channel is unavailable in SSH sessions"** — the MCP server is on a different machine than the browser. Tell the user to run `react-grab-mcp` on the same machine as the browser.
- **Linux missing `xclip` / `wl-clipboard`** — surface the install command from the tool's error verbatim.
- **WSL with broken interop** — surface the WSL interop hint from the tool's error verbatim.

## Constraints

- Do **not** call `get_element_context` more than once per turn. The clipboard payload is short-lived; a second call usually returns the same data or stale data.
- Do **not** invent element details. If the tool returned no context, ask the user; do not fabricate.
- Do **not** rely on the user's chat message alone when they reference "this" / "that" / "the thing I grabbed" — always reach for the tool first.
