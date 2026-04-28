import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { resolveLogFileSinkLocation } from "../src/utils/resolve-log-file-sink-location.js";
import { PROJECT_LOG_FILE_NAME, PROJECT_REACT_GRAB_DIR } from "../src/utils/constants.js";

describe("resolveLogFileSinkLocation", () => {
  it("resolves the log file under .react-grab/ at the given cwd", () => {
    const location = resolveLogFileSinkLocation("/tmp/example");
    expect(location.dir).toBe(path.join("/tmp/example", PROJECT_REACT_GRAB_DIR));
    expect(location.logPath).toBe(
      path.join("/tmp/example", PROJECT_REACT_GRAB_DIR, PROJECT_LOG_FILE_NAME),
    );
    expect(location.gitignorePath).toBe(
      path.join("/tmp/example", PROJECT_REACT_GRAB_DIR, ".gitignore"),
    );
  });

  it("does not normalize away trailing path segments", () => {
    const location = resolveLogFileSinkLocation("/tmp/with-trailing/");
    expect(location.dir).toBe(path.join("/tmp/with-trailing", PROJECT_REACT_GRAB_DIR));
  });
});
