import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WATCH_DIR_HASH_LENGTH, WATCH_STATE_DIR_NAME } from "./constants.js";

const resolveProjectPath = (): string => {
  try {
    return fs.realpathSync(process.cwd());
  } catch {
    return process.cwd();
  }
};

// The default work dir lives under the user's home, keyed by project path, never
// inside the project: a repo-relative dir could ship a committed history.jsonl
// (replayed to the agent as the user's own prompts) or a watch.pid that `stop`
// would SIGTERM.
export const resolveWatchDir = (dirOption: string | undefined): string => {
  if (dirOption) return path.resolve(dirOption);
  const projectPath = resolveProjectPath();
  const projectHash = createHash("sha256")
    .update(projectPath)
    .digest("hex")
    .slice(0, WATCH_DIR_HASH_LENGTH);
  return path.join(os.homedir(), WATCH_STATE_DIR_NAME, "watch", projectHash);
};
