# @react-grab/mcp (deprecated)

This package is deprecated. The MCP server has been replaced by an agent skill that calls the React Grab CLI directly.

## Migration

1. Install the new skill:

   ```bash
   npx -y @react-grab/cli@latest install-skill
   ```

2. Remove the `react-grab-mcp` entry from your agent's `mcp.json` (Cursor, Claude Code, Codex, OpenCode, Windsurf, etc.).

3. Restart your agent. Type `/react-grab` in chat and click an element in the React Grab toolbar — the agent will receive the file name, React component, and HTML snippet.

## Why

Skills auto-trigger on `/react-grab` or when the user references a grabbed element ("this thing", "the component I clicked"), and they shell out to a single short-lived CLI invocation instead of running a long-lived MCP stdio server. One package, one binary, no MCP config to maintain.

## What replaced what

| Old                                 | New                                                 |
| ----------------------------------- | --------------------------------------------------- |
| `react-grab-mcp` (stdio MCP server) | `react-grab watch` (one-shot CLI)                   |
| MCP tool `get_element_context`      | Skill that runs `npx -y @react-grab/cli watch`      |
| `npx @react-grab/cli install-mcp`   | `npx @react-grab/cli install-skill`                 |
| Manual `mcp.json` entry per agent   | `~/.cursor/skills-cursor/react-grab/SKILL.md`, etc. |

See https://github.com/aidenybai/react-grab for full docs.
