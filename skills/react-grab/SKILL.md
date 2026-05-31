---
name: react-grab
description: >-
  Use when the user wants a hands-free loop where grabbing UI elements in the
  browser with React Grab feeds tasks to the agent automatically, with no
  copy-paste or manual handoff. Triggers: "watch react grab", "monitor my
  grabs", "auto-process react grab", "watch my clipboard for grabs". Not for a
  one-off paste of a single grab; this is the continuous, always-on loop.
---

# React Grab

The user selects UI elements in their browser and copies them with React Grab.
`npx grab pull` waits for new grabs and prints each as one line of JSON (usually
one, sometimes a few if several were copied), starting the background watcher
automatically the first time. Run it in a loop.

## The loop

Repeat until the user says stop:

1. Wait for the next grab:

```bash
npx grab pull
```

It blocks until the user grabs something, then prints the new grab(s) — one JSON
object per line. Act on every line. If your shell cancels the command before a
grab arrives, just run it again — nothing is lost; the watcher keeps capturing in
the background and `pull` resumes where it left off.

2. Act on the grab (below).
3. Go back to step 1.

## Acting on a grab

Each grab JSON has `content` (the element's source references) and, in prompt
mode, `prompt` (the user's typed instruction):

- **`prompt` present** → that comment IS the task. Execute it against the grabbed
  source; `content` holds the references (`// path:line`, `in Component (at …)`),
  so jump straight to that file.
- **No `prompt`** → apply the standing instruction the user set when starting the
  loop, or, if there is none, triage it (summarize component + `file:line`) and
  wait for direction.

## Stopping

When the user says stop, run this and don't pull again:

```bash
npx grab stop
```

## Notes

- The watcher reads the clipboard on the machine it runs on — run it on the same
  machine as the browser, not over SSH or in a remote container.
- Grabs older than ~5 minutes are skipped as stale; use `npx grab pull --max-age 0`
  to deliver every grab regardless of age.
