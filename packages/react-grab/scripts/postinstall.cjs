const AUTOMATION_ENVIRONMENT_VARIABLE_NAMES = [
  "CURSOR_AGENT",
  "CI",
  "CLAUDECODE",
  "CODEX_CI",
  "OPENCODE",
  "AMP_HOME",
  "AMI",
];

const REACT_GRAB_INIT_COMMAND = "npx -y grab@latest init";
const INSTALL_HINT_MESSAGE = `[react-grab] Package installed via automation. This step only installs the package. Run \`${REACT_GRAB_INIT_COMMAND}\` to complete setup.`;

const isRunningInAutomatedEnvironment =
  AUTOMATION_ENVIRONMENT_VARIABLE_NAMES.some((environmentVariableName) =>
    Boolean(process.env[environmentVariableName]),
  );

if (isRunningInAutomatedEnvironment) {
  console.log(INSTALL_HINT_MESSAGE);
}
