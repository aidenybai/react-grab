import { checkIsNextProject } from "../core/context.js";
import { buildOpenFileUrl } from "./build-open-file-url.js";

const tryDevServerOpen = async (
  filePath: string,
  lineNumber: number | undefined,
): Promise<boolean> => {
  const params = new URLSearchParams({ file: filePath });
  if (lineNumber) params.set("line", String(lineNumber));
  params.set("column", "1");

  const endpoint = checkIsNextProject()
    ? "/__nextjs_launch-editor"
    : "/__open-in-editor";
  const response = await fetch(`${endpoint}?${params}`);
  return response.ok;
};

export const openFile = async (
  filePath: string,
  lineNumber: number | undefined,
  transformUrl?: (url: string, filePath: string, lineNumber?: number) => string,
): Promise<void> => {
  const wasOpenedByDevServer = await tryDevServerOpen(
    filePath,
    lineNumber,
  ).catch(() => false);
  if (wasOpenedByDevServer) return;

  const rawUrl = buildOpenFileUrl(filePath, lineNumber);
  const url = transformUrl
    ? transformUrl(rawUrl, filePath, lineNumber)
    : rawUrl;
  window.open(url, "_blank", "noopener,noreferrer");
};
