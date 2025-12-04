interface ChangelogEntry {
  version: string;
  changeType: string;
  changes: string[];
}

export const parseChangelog = (markdown: string): ChangelogEntry[] => {
  const entries: ChangelogEntry[] = [];
  const lines = markdown.split("\n");

  let currentEntry: ChangelogEntry | null = null;

  for (const line of lines) {
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+)/);
    if (versionMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        version: versionMatch[1],
        changeType: "",
        changes: [],
      };
      continue;
    }

    const changeTypeMatch = line.match(/^### (.+)/);
    if (changeTypeMatch && currentEntry) {
      currentEntry.changeType = changeTypeMatch[1];
      continue;
    }

    const changeMatch = line.match(/^- (.+)/);
    if (changeMatch && currentEntry) {
      currentEntry.changes.push(changeMatch[1]);
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
};





