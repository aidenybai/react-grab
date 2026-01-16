import { execSync } from "node:child_process";

export type EditorId =
  | "cursor"
  | "vscode"
  | "antigravity"
  | "zed"
  | "webstorm"
  | null;

export interface IDEInfo {
  editorId: EditorId;
  editorName: string | null;
  urlScheme: string | null;
}

interface EditorConfig {
  id: EditorId;
  name: string;
  urlScheme: string;
  processPatterns: string[];
}

const EDITOR_CONFIGS: EditorConfig[] = [
  {
    id: "antigravity",
    name: "Antigravity",
    urlScheme: "antigravity",
    processPatterns: ["antigravity", "Antigravity"],
  },
  {
    id: "cursor",
    name: "Cursor",
    urlScheme: "cursor",
    processPatterns: ["cursor", "Cursor"],
  },
  {
    id: "vscode",
    name: "VS Code",
    urlScheme: "vscode",
    processPatterns: ["Visual Studio Code", "Code.app", "code-server", "Code.exe"],
  },
  {
    id: "zed",
    name: "Zed",
    urlScheme: "zed",
    processPatterns: ["zed", "Zed"],
  },
  {
    id: "webstorm",
    name: "WebStorm",
    urlScheme: "webstorm",
    processPatterns: ["webstorm", "WebStorm"],
  },
];

const getProcessName = (pid: number): string | null => {
  try {
    const platform = process.platform;

    if (platform === "darwin" || platform === "linux") {
      const result = execSync(`ps -p ${pid} -o comm=`, {
        encoding: "utf-8",
        timeout: 1000,
      }).trim();
      return result || null;
    }

    if (platform === "win32") {
      const result = execSync(
        `wmic process where ProcessId=${pid} get Name /format:value`,
        {
          encoding: "utf-8",
          timeout: 1000,
        },
      );
      const match = result.match(/Name=(.+)/);
      return match ? match[1].trim() : null;
    }

    return null;
  } catch {
    return null;
  }
};

const getParentPid = (pid: number): number | null => {
  try {
    const platform = process.platform;

    if (platform === "darwin" || platform === "linux") {
      const result = execSync(`ps -p ${pid} -o ppid=`, {
        encoding: "utf-8",
        timeout: 1000,
      }).trim();
      const ppid = parseInt(result, 10);
      return isNaN(ppid) ? null : ppid;
    }

    if (platform === "win32") {
      const result = execSync(
        `wmic process where ProcessId=${pid} get ParentProcessId /format:value`,
        {
          encoding: "utf-8",
          timeout: 1000,
        },
      );
      const match = result.match(/ParentProcessId=(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }

    return null;
  } catch {
    return null;
  }
};

const matchEditorFromProcessName = (
  processName: string,
): EditorConfig | null => {
  const lowerName = processName.toLowerCase();

  for (const config of EDITOR_CONFIGS) {
    for (const pattern of config.processPatterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return config;
      }
    }
  }

  return null;
};

export const detectParentIDE = (maxDepth = 10): IDEInfo => {
  const noIDEResult: IDEInfo = {
    editorId: null,
    editorName: null,
    urlScheme: null,
  };

  try {
    let currentPid = process.ppid;
    let depth = 0;

    while (currentPid && currentPid > 1 && depth < maxDepth) {
      const processName = getProcessName(currentPid);

      if (processName) {
        const editorConfig = matchEditorFromProcessName(processName);

        if (editorConfig) {
          return {
            editorId: editorConfig.id,
            editorName: editorConfig.name,
            urlScheme: editorConfig.urlScheme,
          };
        }
      }

      const parentPid = getParentPid(currentPid);
      if (!parentPid || parentPid === currentPid) {
        break;
      }

      currentPid = parentPid;
      depth++;
    }
  } catch {
    // Silently fail and return no IDE detected
  }

  return noIDEResult;
};

// Encode file path for custom URI schemes while preserving path delimiters
const encodePathForCustomScheme = (filePath: string): string => {
  // Ensure path starts with /
  const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  // Split by "/" to preserve path structure, then encode each segment
  return normalizedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

export const buildEditorUrl = (
  editorId: EditorId,
  filePath: string,
  lineNumber?: number,
): string | null => {
  if (!editorId) return null;

  const config = EDITOR_CONFIGS.find((c) => c.id === editorId);
  if (!config) return null;

  if (editorId === "webstorm") {
    const lineParam = lineNumber ? `&line=${lineNumber}` : "";
    return `${config.urlScheme}://open?file=${encodeURIComponent(filePath)}${lineParam}`;
  }

  const encodedPath = encodePathForCustomScheme(filePath);
  const lineParam = lineNumber ? `:${lineNumber}` : "";
  return `${config.urlScheme}://file${encodedPath}${lineParam}`;
};
