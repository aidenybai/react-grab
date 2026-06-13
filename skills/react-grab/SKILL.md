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
`npx react-grab@latest pull` waits for new grabs and prints each as one line of
JSON (usually one, sometimes a few if several were copied), starting the
background watcher automatically the first time. Run it in a loop.

## The loop

Repeat until the user says stop:

1. Wait for the next grab:

```bash
npx react-grab@latest pull --max-age 0
```

It blocks until the user grabs something, then prints the new grab(s) — one JSON
object per line. `--max-age 0` is important: it delivers every grab regardless of
age, so a comment the user added while you were busy on the previous task isn't
silently dropped (the default skips grabs older than ~5 min as stale). Act on
every line. If your shell cancels the command before a grab arrives, just run it
again — nothing is lost; the watcher keeps capturing in the background and `pull`
resumes where it left off.

2. Act on the grab (below).
3. Go back to step 1.

## A new grab while you're working wins

The watcher never stops capturing — including while you're mid-task. A grab the
user makes before you finish is them redirecting you, so it supersedes whatever
you're doing. Don't make them wait for the old task to finish.

While acting on a grab:

- Run anything slow (dev servers, builds, installs, test runs) as a background
  process, never a blocking foreground call, so you stay free to notice new grabs.
- Between steps, peek without blocking:

```bash
npx react-grab@latest pull --max-age 0 --wait 0
```

Empty output means nothing new — keep going. If it prints a grab, the user has
moved on: stop the current task, cancel any background processes you started for
it, and act on the newest grab instead.

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
npx react-grab@latest stop
```

## Notes

- The watcher reads the clipboard on the machine it runs on — run it on the same
  machine as the browser, not over SSH or in a remote container.
