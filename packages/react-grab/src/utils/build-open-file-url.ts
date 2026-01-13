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

// Build editor-specific URL scheme
const buildEditorUrl = (
  editorId: EditorId,
  filePath: string,
  lineNumber?: number,
): string | null => {
  if (!editorId) return null;

  if (editorId === "webstorm") {
    const lineParam = lineNumber ? `&line=${lineNumber}` : "";
    return `webstorm://open?file=${encodeURIComponent(filePath)}${lineParam}`;
  }

  const lineParam = lineNumber ? `:${lineNumber}` : "";
  return `${editorId}://file${filePath}${lineParam}`;
};

// Global IDE info storage - set by relay client or manually
let globalIDEInfo: IDEInfo | null = null;

export const setGlobalIDEInfo = (ideInfo: IDEInfo | null): void => {
  globalIDEInfo = ideInfo;
};

export const getGlobalIDEInfo = (): IDEInfo | null => {
  return globalIDEInfo;
};

export const buildOpenFileUrl = (
  filePath: string,
  lineNumber?: number,
  ideInfo?: IDEInfo | null,
): string => {
  // Use provided IDE info, or fall back to global IDE info
  const effectiveIDEInfo = ideInfo ?? globalIDEInfo;

  // If IDE is detected, try to generate direct URL scheme
  if (effectiveIDEInfo?.editorId) {
    const directUrl = buildEditorUrl(
      effectiveIDEInfo.editorId,
      filePath,
      lineNumber,
    );
    if (directUrl) {
      return directUrl;
    }
  }

  // Fall back to antigravity (default editor)
  const lineParam = lineNumber ? `:${lineNumber}` : "";
  return `antigravity://file${filePath}${lineParam}`;
};
