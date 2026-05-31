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

The user selects UI elements in their browser and copies them with React Grab. A
background daemon captures each grab to `./.react-grab/history.jsonl`; you pull
them with `grab read`. Nothing blocks the agent: the daemon runs detached and
`read` returns promptly, so the loop survives shell-command timeouts.

## Start the daemon (once)

```bash
npx grab@latest watch
```

This launches a detached daemon that watches the clipboard. It is idempotent per
dir — re-running it while a daemon is already watching this project is a no-op —
so it is safe to run at the start of every session. `--dir <path>` relocates the
capture dir; `--text-only` skips the native clipboard reader.

## The loop

Repeat until the user says stop:

1. Pull the next grab — this blocks until one arrives:

```bash
npx grab read --wait infinite
```

Give the command a long timeout. If your shell cancels it before a grab arrives,
just run it again — the daemon keeps capturing in the background, so nothing is
lost. Each line of stdout is one grab as JSON.

2. Act on each grab (below).
3. Go back to step 1.

`read` advances a cursor (`./.react-grab/cursor.txt`), so each grab is delivered
exactly once across calls. Grabs older than ~5 minutes are treated as stale and
skipped (override with `--max-age <ms>`, or `--max-age 0` to never evict). Add
`--all` to replay the whole history from the start.

## Gotchas

- **Empty `read` output is not an error** — it just means no grab landed yet.
  Re-run it; never treat empty output as the daemon being dead or the loop being
  done. Only the user saying "stop" ends the loop.
- **The daemon reads the clipboard on the machine it runs on.** Over SSH, in a
  container, or on a cloud host while the browser is on the user's laptop, grabs
  never arrive. The daemon must run on the same machine as the browser.
- **Run one `read` at a time.** Concurrent reads share `cursor.txt` and can
  double-deliver or skip grabs — keep the loop sequential.
- **`read --all` replays the whole history without consuming it** — it does not
  advance the cursor, so use it only to inspect history; the loop's plain `read`
  is what delivers each grab exactly once.
- **If grabs never arrive even though the user is grabbing**, the daemon may not
  be staying up. A healthy daemon makes `npx grab@latest watch` report
  `already watching`; if it keeps reporting `started`, the daemon is dying on
  startup — usually no clipboard reader. Try `npx grab watch --text-only`, or run
  `npx grab watch --foreground` once to see the startup error directly.

## Acting on a grab

Each grab JSON has `content` (the element's source references) and, in prompt
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

When the user says stop, stop the daemon and do not read again:

```bash
npx grab@latest watch --stop
```

Confirm the loop has stopped.
