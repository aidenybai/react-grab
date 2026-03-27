export interface GitBlameInfo {
  author: string;
  date: string;
  commitHash: string;
  commitMessage: string;
}

let failCount = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

export const fetchGitBlame = async (
  filePath: string,
  lineNumber: number | null,
): Promise<GitBlameInfo | null> => {
  if (failCount >= MAX_CONSECUTIVE_FAILURES) return null;

  const params = new URLSearchParams({ file: filePath });
  if (lineNumber) params.set("line", String(lineNumber));

  try {
    const response = await fetch(
      `/__react-grab/git-blame?${params}`,
    );
    if (!response.ok) {
      failCount++;
      return null;
    }
    failCount = 0;
    return (await response.json()) as GitBlameInfo;
  } catch {
    failCount++;
    return null;
  }
};
