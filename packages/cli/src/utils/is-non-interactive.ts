const AGENT_ENVIRONMENT_VARIABLES = [
  "CI",
  "CLAUDECODE",
  "CURSOR_AGENT",
  "CODEX_CI",
  "OPENCODE",
  "AMP_HOME",
  "AMI",
] as const;

const isEnvironmentVariableSet = (variable: string): boolean =>
  Boolean(process.env[variable]);

export const detectNonInteractive = (yesFlag: boolean): boolean =>
  yesFlag ||
  AGENT_ENVIRONMENT_VARIABLES.some(isEnvironmentVariableSet) ||
  !process.stdin.isTTY;
