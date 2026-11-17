---
"@react-grab/cli": patch
---

Keep the `pull`/`watch`/`stop` work dir under `~/.react-grab/watch/<project hash>` instead of `./.react-grab`, so a cloned repo can no longer ship a `history.jsonl` that `pull` replays to the agent as the user's prompts, or a `watch.pid` that `stop` would signal. `pull` also now drops records without a `receivedAt` unless `--max-age 0` is set.
