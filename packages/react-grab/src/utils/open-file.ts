import { checkIsNextProject } from "../core/context.js";
import { buildOpenFileUrl } from "./build-open-file-url.js";

// Next.js App Router dev server injects a virtual path segment into stack frames.
// Strip it before passing the path to the launch-editor endpoint.
const stripAppRouterVirtualSegments = (filePath: string): string =>
  filePath.replace(/\/\(app-pages-browser\)\//g, "/");

const tryDevServerOpen = async (
  filePath: string,
  lineNumber: number | undefined,
): Promise<boolean> => {
  const isNextProject = checkIsNextProject();
  const params = new URLSearchParams({
    file: isNextProject ? stripAppRouterVirtualSegments(filePath) : filePath,
  });

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
  const normalizedPath = checkIsNextProject()
    ? stripAppRouterVirtualSegments(filePath)
    : filePath;

  const wasOpenedByDevServer = await tryDevServerOpen(
    normalizedPath,
    lineNumber,
  ).catch(() => false);
  if (wasOpenedByDevServer) return;

  const rawUrl = buildOpenFileUrl(normalizedPath, lineNumber);
  const url = transformUrl
    ? transformUrl(rawUrl, normalizedPath, lineNumber)
    : rawUrl;
  window.open(url, "_blank", "noopener,noreferrer");
};
