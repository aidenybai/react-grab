import { createPageMetadata } from "@/lib/metadata";
import { readFileSync } from "fs";
import { join } from "path";
import { parseChangelog } from "@/utils/parse-changelog";
import { PageHeader } from "@/components/page-header";

export const metadata = createPageMetadata({
  title: "Changelog",
  description: "Release notes and version history for React Grab",
  path: "/changelog",
});

const getChangelog = () => {
  const changelogPath = join(process.cwd(), "..", "..", "packages", "react-grab", "CHANGELOG.md");
  const content = readFileSync(changelogPath, "utf-8");
  return parseChangelog(content);
};

const ChangelogPage = () => {
  const entries = getChangelog();

  return (
    <div className="min-h-screen bg-background px-6 py-8 text-prose sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col pt-8">
        <PageHeader title="Changelog" subtitle="Release notes and version history" />

        <div className="mt-8 flex flex-col gap-8">
          {entries.map((entry) => (
            <div key={`${entry.version}-${entry.changeType}`} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-title">{entry.version}</span>
                <span className="text-xs text-faint">{entry.changeType}</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {entry.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="flex items-start gap-2 text-sm text-prose">
                    <span className="select-none text-faint">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

ChangelogPage.displayName = "ChangelogPage";

export default ChangelogPage;
