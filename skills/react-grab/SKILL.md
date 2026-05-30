---
name: react-grab
description: >-
  Use when the user wants a hands-free loop where grabbing UI elements in the
  browser with React Grab feeds tasks to the agent automatically, with no
  copy-paste or manual handoff. Triggers: "watch react grab", "monitor my
  grabs", "auto-process react grab", "watch my clipboard for grabs". Not for a
  one-off paste of a single grab; this is the continuous, always-on loop.
disable-model-invocation: true
---

# React Grab

The user selects UI elements in their browser and copies them with React Grab.
`npx grab watch` blocks until the next grab lands on the clipboard, prints it as
one line of JSON, and exits. Run it, act on the grab, run it again: that is the
whole loop. No background process, no notifications, no polling, just a blocking
command you keep re-running until the user says stop.

## The loop

1. Run `npx grab watch` in the foreground. It blocks until the user grabs
   something, then prints the grab JSON and exits 0.
2. Act on the grab (below).
3. Repeat.

Each grab is also appended to `./.react-grab/history.jsonl` as a durable record;
the command drops a `.gitignore` there so it never lands in git. `--dir <path>`
relocates it, `--text-only` skips the native clipboard reader.

## Acting on a grab

The grab JSON has `content` (the element's source references) and, in prompt
mode, `prompt` (the user's typed instruction):

- **`prompt` present** → that comment IS the task. Execute it against the grabbed
  source; `content` holds the references (`// path:line`, `in Component (at …)`),
  so jump straight to that file.
- **No `prompt`** → apply the standing instruction the user set when starting the
  loop, or, if there is none, triage it (summarize component + `file:line`) and
  wait for direction.

A standing instruction is optional; prompt mode lets the user steer each grab
inline.

## Stopping

When the user says stop, interrupt the command if it is still blocking and do not
run it again. Confirm the loop has stopped.
