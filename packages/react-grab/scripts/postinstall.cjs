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

const createInstallMessage = () => {
  const detectedAgentEnvironmentVariableNames =
    getDetectedAgentEnvironmentVariableNames();
  const automatedEnvironmentMessage =
    detectedAgentEnvironmentVariableNames.length > 0
      ? ` Automated environment detected (${detectedAgentEnvironmentVariableNames.join(", ")}).`
      : "";

  return `[react-grab] Package installed.${automatedEnvironmentMessage} This does not initialize your project. Run \`${REACT_GRAB_INIT_COMMAND}\` to set up React Grab.`;
};

console.log(createInstallMessage());
