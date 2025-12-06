# @react-grab/codex

Codex CLI bridge for React Grab. It spawns `codex exec --json -`, streams Codex events to SSE, and provides a browser client that plugs into React Grab.

## Getting started

1. Install the Codex CLI and ensure `codex` is on your PATH.
2. Install the package: `pnpm add @react-grab/codex`.
3. Start the local bridge (default port 6567): `npx react-grab-codex`.
4. Include the client in your page or extension:
   ```ts
   import { attachAgent } from "@react-grab/codex/client";
   attachAgent();
   ```

## Options

- `workspace` (default: current working directory) via `--cd`.
- `model` passed to `codex exec`.
- `fullAuto` defaults to `true`; set `false` to disable.
- `yolo` opt-in flag.
- `sandbox`, `profile`, `skipGitRepoCheck`, `config[]`, `outputSchemaPath` forwarded when provided.

Resume is supported through stored React Grab sessions (replays context), not Codex thread resume.