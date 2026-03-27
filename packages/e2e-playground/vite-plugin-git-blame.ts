import type { Plugin } from "vite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

interface GitBlameResult {
  author: string;
  date: string;
  commitHash: string;
  commitMessage: string;
}

const parseGitBlamePorcelain = (output: string): GitBlameResult | null => {
  const lines = output.split("\n");
  if (lines.length === 0) return null;

  const commitHash = lines[0]?.split(" ")[0] ?? "";
  let author = "";
  let date = "";
  let commitMessage = "";

  for (const line of lines) {
    if (line.startsWith("author ")) {
      author = line.slice("author ".length);
    } else if (line.startsWith("author-time ")) {
      const timestamp = Number(line.slice("author-time ".length));
      date = new Date(timestamp * 1000).toISOString();
    } else if (line.startsWith("summary ")) {
      commitMessage = line.slice("summary ".length);
    }
  }

  if (!author) return null;

  return { author, date, commitHash: commitHash.slice(0, 8), commitMessage };
};

export const reactGrabGitBlame = (): Plugin => ({
  name: "react-grab-git-blame",
  configureServer(server) {
    const root = server.config.root;

    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? "", "http://localhost");
      if (url.pathname !== "/__react-grab/git-blame") return next();

      const file = url.searchParams.get("file");
      const line = url.searchParams.get("line");

      if (!file) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing file parameter" }));
        return;
      }

      // Resolve root-relative paths (e.g. /src/App.tsx) to absolute
      const absoluteFile = path.isAbsolute(file)
        ? file.startsWith(root)
          ? file
          : path.join(root, file)
        : path.resolve(root, file);

      const lineNum = line ? Number(line) : null;

      try {
        const args = ["blame", "--porcelain"];
        if (lineNum && lineNum > 0) {
          args.push("-L", `${lineNum},${lineNum}`);
        } else {
          args.push("-L", "1,1");
        }
        args.push("--", absoluteFile);

        const { stdout } = await execFileAsync("git", args, {
          timeout: 5000,
        });

        const result = parseGitBlamePorcelain(stdout);
        if (!result) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Could not parse blame output" }));
          return;
        }

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Git blame failed";
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
    });
  },
});
