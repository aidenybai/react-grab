import { isNextProjectRuntime } from "./is-next-project-runtime.js";
import { getNextBasePath } from "./get-next-base-path.js";
import { normalizeFilePath } from "./normalize-file-path.js";

const OPEN_FILE_BASE_URL =
  process.env.NODE_ENV === "production" ? "https://react-grab.com" : "http://localhost:3000";

const tryDevServerOpen = async (
  filePath: string,
  lineNumber: number | undefined,
): Promise<boolean> => {
  const isNextProject = isNextProjectRuntime();
  const params = new URLSearchParams({ file: filePath });

  const lineKey = isNextProject ? "line1" : "line";
  const columnKey = isNextProject ? "column1" : "column";
  if (lineNumber) params.set(lineKey, String(lineNumber));
  params.set(columnKey, "1");

  const endpoint = isNextProject
    ? `${getNextBasePath()}/__nextjs_launch-editor`
    : "/__open-in-editor";
  const response = await fetch(`${endpoint}?${params}`);
  return response.ok;
};

export const requestOpenFile = async (
  filePath: string,
  lineNumber: number | undefined,
  transformUrl?: (url: string, filePath: string, lineNumber?: number) => string,
): Promise<void> => {
  const normalizedFilePath = normalizeFilePath(filePath);

  const wasOpenedByDevServer = await tryDevServerOpen(normalizedFilePath, lineNumber).catch(
    () => false,
  );
  if (wasOpenedByDevServer) return;

  const lineParam = lineNumber ? `&line=${lineNumber}` : "";
  const rawUrl = `${OPEN_FILE_BASE_URL}/open-file?url=${encodeURIComponent(normalizedFilePath)}${lineParam}`;
  const url = transformUrl ? transformUrl(rawUrl, normalizedFilePath, lineNumber) : rawUrl;
  window.open(url, "_blank", "noopener,noreferrer");
};
