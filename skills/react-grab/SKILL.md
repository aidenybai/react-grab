---
name: react-grab
description: >-
  Use when the user describes a UI change or peeks at elements via React Grab.
  Triggers: "make this button bigger", "fix the header spacing", "change the
  color of this component", "peek at my app", "peek at this element", "watch
  react grab", "monitor my grabs", "auto-process react grab", "watch my
  clipboard for grabs". Not for a one-off paste; this is the always-on peek
  loop.
---

# React Grab

You peek at UI elements in the browser with React Grab, selecting components to inspect source context, styles, and metadata.

Invoking this skill starts pulling:

```bash
npx react-grab@latest pull --max-age 0
```

This blocks until the user peeks at something, then prints 1 JSON object per line. The background watcher starts automatically on first run. Run it in a loop.

## The loop

Repeat until the user says stop:

1. Pull, wait for the next peek:

```bash
npx react-grab@latest pull --max-age 0
```

`--max-age 0` delivers every peek regardless of age, so nothing the user added while you were busy is silently dropped. The default skips peeks older than ~5 min as stale. Act on every line. If your shell cancels the command before a peek arrives, re-run it. Nothing is lost; the watcher keeps capturing and `pull` resumes where it left off.

2. Act on the peek (below).
3. Go back to step 1.

## A new peek while you're working wins

The watcher never stops capturing, including mid-task. A new peek supersedes whatever you're doing. Don't make the user wait for the old task to finish.

While acting on a peek:

- Run anything slow (dev servers, builds, installs, test runs) in the background so you stay free to notice new peeks.
- Between steps, peek without blocking:

```bash
npx react-grab@latest pull --max-age 0 --wait 0
```

Empty output means nothing new. Keep going. If it prints a peek, stop the current task, cancel background processes you started for it, and act on the newest peek instead.

## Acting on a peek

Each peek JSON has `content` (source references) and, in prompt mode, `prompt` (the user's typed instruction):

- **`prompt` present**: execute it against the peeked source. `content` holds references (`// path:line`, `in Component (at …)`), so jump straight to that file.
- **No `prompt`**: apply the standing instruction the user set when starting the loop. If none exists, triage it (summarize component + `file:line`) and wait for direction.

## Stopping

When the user says stop, run this and don't peek again:

```bash
npx react-grab@latest stop
```

## Notes

- The watcher reads the clipboard on the machine it runs on. Run it on the same machine as the browser, not over SSH or in a remote container.
