export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const COMMAND_INSTALL_MAP: Record<string, string> = {
  "cursor-agent":
    "Install Cursor (https://cursor.com) and ensure 'cursor-agent' is in your PATH.",
  gemini:
    "Install the Gemini CLI: npm install -g @anthropic-ai/gemini-cli\nOr see: https://github.com/google-gemini/gemini-cli",
  claude:
    "Install Claude Code: npm install -g @anthropic-ai/claude-code\nOr see: https://github.com/anthropics/claude-code",
};

interface SpawnError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
}

export const formatSpawnError = (error: Error, commandName: string): string => {
  const spawnError = error as SpawnError;
  const isNotFound =
    spawnError.code === "ENOENT" ||
    (spawnError.message && spawnError.message.includes("ENOENT"));

  if (isNotFound) {
    const installInfo = COMMAND_INSTALL_MAP[commandName];
    const baseMessage = `Command '${commandName}' not found.`;

    if (installInfo) {
      return `${baseMessage}\n\n${installInfo}`;
    }

    return `${baseMessage}\n\nMake sure '${commandName}' is installed and available in your PATH.`;
  }

  const isPermissionDenied =
    spawnError.code === "EACCES" ||
    (spawnError.message && spawnError.message.includes("EACCES"));

  if (isPermissionDenied) {
    return `Permission denied when trying to run '${commandName}'.\n\nCheck that the command is executable: chmod +x $(which ${commandName})`;
  }

  return error.message;
};
