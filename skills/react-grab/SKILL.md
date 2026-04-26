---
name: react-grab
description: >-
  Pull the next React Grab selection from the user's clipboard. Use when the
  user invokes /react-grab or references "this thing", "the element I clicked",
  or "the component I just grabbed" without having already pasted the content.
  If the user has already pasted React Grab toolbar output into the chat, use
  the pasted content directly - do NOT run this skill (it would block waiting
  for a fresh clipboard timestamp that is not coming).
---

# React Grab

When the user wants the agent to act on a UI element they're about to (or just
did) click in the React Grab toolbar, the canonical description of that element
travels through the system clipboard under the custom MIME type
`application/x-react-grab`.

## What to do

1. Run `npx -y @react-grab/cli watch` exactly once at the top of the turn.
2. The CLI blocks until a fresh React Grab payload appears on the clipboard
   (or 10 minutes elapse, whichever comes first). While it waits, tell the user
   to click an element in the React Grab toolbar (the box that appears when
   they hover the page). They can also type a prompt into the toolbar before
   clicking - that prompt is included in the output.
3. Treat the CLI's stdout as the authoritative description of the target
   element. It contains:
   - The user's prompt (if any).
   - The HTML snippet of the selected element(s).
   - Component stack / source file paths.
4. Plan and execute the user's request against that returned context.

## Failure modes

- **Exit code 1 ("Timed out...")** - the user didn't click anything within the
  timeout. Ask them to click and re-run; do not retry inside the same turn.
- **Exit code 2 ("Clipboard channel is unavailable in SSH sessions")** - the
  CLI is on a different machine than the browser. Tell the user to run the
  agent on the same machine as the browser.
- **Linux missing `xclip` / `wl-clipboard`** - surface the install command
  from the CLI's stderr verbatim.
- **WSL with broken interop** - surface the WSL interop hint from stderr
  verbatim.

## Constraints

- Do NOT call `react-grab watch` more than once per turn. The CLI blocks until
  a fresh grab arrives; a second call would just block again.
- Do NOT invent element details. If the CLI failed, ask the user; do not
  fabricate.
- Do NOT rely on the user's chat message alone when they reference "this" /
  "that" / "the thing I grabbed" - always invoke the CLI first.
