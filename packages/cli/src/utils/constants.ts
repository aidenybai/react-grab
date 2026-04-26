export const MAX_SUGGESTIONS_COUNT = 30;
export const MAX_KEY_HOLD_DURATION_MS = 2000;
export const MAX_CONTEXT_LINES = 50;
export const CLIPBOARD_READ_TIMEOUT_MS = 3000;
export const REACT_GRAB_MIME_TYPE = "application/x-react-grab";
export const WATCH_POLL_INTERVAL_MS = 250;
export const WATCH_DEFAULT_TIMEOUT_MS = 600_000;
export const MS_PER_SECOND = 1000;
export const NPM_PACKAGE_NAME = "@react-grab/cli";
export const SKILL_NAME = "react-grab";

export const CANONICAL_AGENTS_DIR = ".agents";
export const CANONICAL_SKILLS_SUBDIR = "skills";
export const STATE_DIR_NAME = "react-grab";
export const LAST_SELECTED_AGENTS_FILE = "last-selected-agents.json";
export const FALLBACK_STATE_HOME_RELATIVE = ".local/state";

export const CI_ENV_KEYS = [
  "CI",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "CIRCLECI",
  "TRAVIS",
  "BUILDKITE",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
  "DRONE",
  "BITBUCKET_BUILD_NUMBER",
] as const;

export const TELEMETRY_OPT_OUT_ENV_KEYS = ["DISABLE_TELEMETRY", "DO_NOT_TRACK"] as const;
