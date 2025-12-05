import type { EditorType, OpenInEditorOptions } from "../types.js";

/**
 * URL schemes for different editors
 * {file} - absolute file path
 * {line} - line number (optional)
 * {column} - column number (optional)
 */
const EDITOR_URL_SCHEMES: Record<string, string> = {
  vscode: "vscode://file{file}:{line}:{column}",
  cursor: "cursor://file{file}:{line}:{column}",
  webstorm: "webstorm://open?file={file}&line={line}&column={column}",
  phpstorm: "phpstorm://open?file={file}&line={line}&column={column}",
  idea: "idea://open?file={file}&line={line}&column={column}",
  zed: "zed://file{file}:{line}:{column}",
  sublime: "subl://open?url=file://{file}&line={line}&column={column}",
  atom: "atom://core/open/file?filename={file}&line={line}&column={column}",
  emacs: "emacs://open?url=file://{file}&line={line}&column={column}",
  vim: "mvim://open?url=file://{file}&line={line}&column={column}",
};

/**
 * Default editor detection order
 */
const EDITOR_DETECTION_ORDER: EditorType[] = [
  "cursor",
  "vscode",
  "zed",
  "webstorm",
  "idea",
  "phpstorm",
  "sublime",
  "atom",
];

/**
 * Try to detect which editor the user is likely using
 * This is a simple heuristic based on common patterns
 */
function detectEditor(): EditorType {
  if (typeof window === "undefined") {
    return "vscode"; // Default fallback
  }

  // Check for Cursor-specific indicators
  // Cursor uses a different user agent or has specific window properties
  const userAgent = navigator.userAgent.toLowerCase();

  // Check URL referrer or opener for hints
  const referrer = document.referrer.toLowerCase();

  if (referrer.includes("cursor") || userAgent.includes("cursor")) {
    return "cursor";
  }

  if (referrer.includes("vscode") || userAgent.includes("vscode")) {
    return "vscode";
  }

  // Check localStorage for previous editor preference
  try {
    const savedEditor = localStorage.getItem("react-grab-editor");
    if (savedEditor && savedEditor in EDITOR_URL_SCHEMES) {
      return savedEditor as EditorType;
    }
  } catch {
    // localStorage not available
  }

  // Default to vscode as it's most common
  return "vscode";
}

/**
 * Build the URL to open a file in the editor
 */
function buildEditorUrl(
  editor: EditorType,
  filePath: string,
  lineNumber?: number,
  column?: number,
  customUrlScheme?: string,
): string {
  const scheme = customUrlScheme || EDITOR_URL_SCHEMES[editor];

  if (!scheme) {
    // Fallback to vscode if editor not found
    return buildEditorUrl("vscode", filePath, lineNumber, column);
  }

  return scheme
    .replace("{file}", filePath)
    .replace("{line}", String(lineNumber || 1))
    .replace("{column}", String(column || 1));
}

/**
 * Open a file in the configured editor
 */
export function openInEditor(
  filePath: string,
  options?: OpenInEditorOptions & { lineNumber?: number; column?: number },
): boolean {
  if (!options?.enabled) {
    return false;
  }

  const editor = options.editor === "auto" ? detectEditor() : (options.editor || "vscode");
  const url = buildEditorUrl(
    editor,
    filePath,
    options.lineNumber,
    options.column,
    options.customUrlScheme,
  );

  try {
    // Use window.open for URL scheme
    // Some browsers block window.open, so we also try location.href
    const opened = window.open(url, "_self");
    if (!opened) {
      // Fallback: create a hidden link and click it
      const link = document.createElement("a");
      link.href = url;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (error) {
    console.warn("[react-grab] Failed to open editor:", error);
    return false;
  }
}

/**
 * Save user's editor preference
 */
export function saveEditorPreference(editor: EditorType): void {
  try {
    localStorage.setItem("react-grab-editor", editor);
  } catch {
    // localStorage not available
  }
}

export { EDITOR_URL_SCHEMES, EDITOR_DETECTION_ORDER, detectEditor, buildEditorUrl };
