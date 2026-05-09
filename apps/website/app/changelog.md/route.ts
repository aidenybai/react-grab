import { readFileSync } from "fs";
import { join } from "path";
import { parseChangelog } from "@/utils/parse-changelog";

const BASE_URL = "https://react-grab.com";

export const dynamic = "force-static";

export const GET = (): Response => {
  const changelogPath = join(process.cwd(), "..", "..", "packages", "react-grab", "CHANGELOG.md");
  const content = readFileSync(changelogPath, "utf-8");
  const entries = parseChangelog(content);

  const lines: string[] = [];
  lines.push("# Changelog");
  lines.push("");
  lines.push("> Release notes and version history for React Grab.");
  lines.push("");
  lines.push(`See the [HTML changelog](${BASE_URL}/changelog) for the rendered version.`);
  lines.push("");

  for (const entry of entries) {
    lines.push(`## ${entry.version}`);
    lines.push("");
    if (entry.changeType) {
      lines.push(`*${entry.changeType}*`);
      lines.push("");
    }
    for (const change of entry.changes) {
      lines.push(`- ${change}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
};
