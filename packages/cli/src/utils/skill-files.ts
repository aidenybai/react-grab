const REPO = "aidenybai/react-grab";
const BRANCH = "main";
const BASE_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

export const fetchSkillFile = async (): Promise<string> => {
  const skillUrl = `${BASE_URL}/skills/react-grab-browser/SKILL.md`;
  const response = await fetch(skillUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch SKILL.md: ${response.status}`);
  }
  return response.text();
};

export const AGENT_TARGETS: Record<string, string> = {
  cursor: ".cursor/skills/react-grab-browser",
  claude: ".claude/skills/react-grab-browser",
  codex: ".codex/skills/react-grab-browser",
  amp: ".agents/skills/react-grab-browser",
  vscode: ".vscode/skills/react-grab-browser",
};

export const SUPPORTED_TARGETS = Object.keys(AGENT_TARGETS);
