import { checkIsNextProject } from "../core/context.js";
import { buildOpenFileUrl } from "./build-open-file-url.js";

const tryDevServerOpen = async (
  filePath: string,
  lineNumber: number | undefined,
): Promise<boolean> => {
  const isNextProject = checkIsNextProject();
  const params = new URLSearchParams({ file: filePath });

  const lineKey = isNextProject ? "line1" : "line";
  const columnKey = isNextProject ? "column1" : "column";
  if (lineNumber) params.set(lineKey, String(lineNumber));
  params.set(columnKey, "1");

  const endpoint = isNextProject
    ? "/__nextjs_launch-editor" // Next.js
    : "/__open-in-editor"; // vite
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
