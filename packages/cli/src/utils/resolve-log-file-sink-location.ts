import path from "node:path";
import { PROJECT_LOG_FILE_NAME, PROJECT_REACT_GRAB_DIR } from "./constants.js";

export interface LogFileSinkLocation {
  dir: string;
  logPath: string;
  gitignorePath: string;
}

export const resolveLogFileSinkLocation = (cwd: string): LogFileSinkLocation => {
  const dir = path.join(cwd, PROJECT_REACT_GRAB_DIR);
  return {
    dir,
    logPath: path.join(dir, PROJECT_LOG_FILE_NAME),
    gitignorePath: path.join(dir, ".gitignore"),
  };
};
