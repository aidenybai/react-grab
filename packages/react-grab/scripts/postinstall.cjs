const AGENT_ENVIRONMENT_VARIABLE_NAMES = [
  "CI",
  "CLAUDECODE",
  "CURSOR_AGENT",
  "CODEX_CI",
  "OPENCODE",
  "AMP_HOME",
  "AMI",
];

const REACT_GRAB_INIT_COMMAND = "npx -y grab@latest init";

const isEnvironmentVariableSet = (environmentVariableName) =>
  Boolean(process.env[environmentVariableName]);

const getDetectedAgentEnvironmentVariableNames = () =>
  AGENT_ENVIRONMENT_VARIABLE_NAMES.filter(isEnvironmentVariableSet);

const hasAutomatedEnvironment = () =>
  getDetectedAgentEnvironmentVariableNames().length > 0;

const createInstallMessage = () =>
  `[react-grab] Package installed via automation. This step only installs the package. Run \`${REACT_GRAB_INIT_COMMAND}\` to complete setup.`;

if (hasAutomatedEnvironment()) {
  console.log(createInstallMessage());
}
