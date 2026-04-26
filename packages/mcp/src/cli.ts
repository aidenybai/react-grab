const DEPRECATION_NOTICE = `@react-grab/mcp is deprecated.

The MCP server has been replaced by an agent skill that calls the React Grab
CLI directly. To migrate:

  1. Run: npx -y @react-grab/cli@latest install-skill
  2. Remove the "react-grab-mcp" entry from your agent's mcp.json (Claude Code,
     Cursor, Codex, OpenCode, Windsurf, etc.).
  3. Restart your agent. The /react-grab skill will be auto-invoked.

See https://github.com/aidenybai/react-grab for details.
`;

process.stderr.write(DEPRECATION_NOTICE);
process.exit(1);
