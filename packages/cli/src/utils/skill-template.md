---
name: react-grab
description: >-
  Use when the user invokes /react-grab or refers to "this", "that", or
  "the thing/element/component I just clicked/grabbed". If toolbar output
  is already pasted in the chat, use it directly - do NOT run this skill
  (it would block waiting for clipboard data that never arrives).
allowed-tools:
  - Bash
---

# React Grab

## Preflight

Run **once** before the loop:

```bash
npx -y @react-grab/cli check-installed
```

Exit 0 → installed, continue. Exit 1 → not installed; ask the user "React Grab isn't in this project — want me to run `npx grab@latest init` to set it up?" and only proceed once they confirm and `init` finishes.

## Loop

Repeat until the user says they're done.

1. **Prompt.** "Click an element in the React Grab toolbar (or paste its output here) and I'll pick it up." Don't start step 2 silently.
2. **Read one grab.** Once per iteration:
   ```bash
   npx -y @react-grab/cli log | head -n 1
   ```
   Stdout is one line of NDJSON: `{"prompt":"...","content":"..."}` (`prompt` is omitted if the user didn't type one). Parse it.
3. **Ask** what to do — skip if the parsed JSON has a non-empty `prompt`.
4. **Do it** against `content` only.
5. **Offer another:** "Grab another, or done?" Yes → step 1. No → end.

## Failure modes (surface stderr verbatim)

- Exit 2 SSH → run agent on same machine as browser.
- Linux/WSL clipboard hint → pass install/interop instructions through.
- No idle timeout: `log` does not exit on its own when piped. If the user never clicks, the `head -n 1` stays blocked until your bash tool times out. Surface that as "still waiting for a click" rather than retrying.

## Constraints

- One `log` per iteration, never concurrent.
- Never fabricate element details. `log` failed? Ask, don't guess.
- Step 1 always before step 2.
- Finish step 4 before step 2 again.
