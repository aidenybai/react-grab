const NON_INTERACTIVE_ENVIRONMENT_VARIABLES = [
  "CI",
  "CLAUDECODE",
  "AMI",
] as const;

export const detectNonInteractive = (yesFlag: boolean): boolean =>
  yesFlag ||
  NON_INTERACTIVE_ENVIRONMENT_VARIABLES.some(
    (variable) => process.env[variable] === "true",
  ) ||
  !process.stdin.isTTY;
