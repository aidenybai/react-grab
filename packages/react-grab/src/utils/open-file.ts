import { normalizeFileName } from "bippy/source";
import { checkIsNextProject } from "../core/context.js";
import { getNextBasePath } from "./get-next-base-path.js";

const OPEN_FILE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://react-grab.com"
    : "http://localhost:3000";

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
    ? `${getNextBasePath()}/__nextjs_launch-editor`
    : "/__open-in-editor";
  const response = await fetch(`${endpoint}?${params}`);
  return response.ok;
};

export const openFile = async (
  filePath: string,
  lineNumber: number | undefined,
  transformUrl?: (url: string, filePath: string, lineNumber?: number) => string,
  allowExternalCommunication = true,
): Promise<void> => {
  filePath = normalizeFileName(filePath);

  const wasOpenedByDevServer = await tryDevServerOpen(
    filePath,
    lineNumber,
  ).catch(() => false);
  if (wasOpenedByDevServer) return;

  const lineParam = lineNumber ? `&line=${lineNumber}` : "";
  const rawUrl = `${OPEN_FILE_BASE_URL}/open-file?url=${encodeURIComponent(filePath)}${lineParam}`;
  const url = transformUrl
    ? transformUrl(rawUrl, filePath, lineNumber)
    : rawUrl;
  if (!allowExternalCommunication) {
    let targetUrl: URL;
    try {
      targetUrl = new URL(url, window.location.href);
    } catch {
      return;
    }
    const isHttpProtocol =
      targetUrl.protocol === "http:" || targetUrl.protocol === "https:";
    if (isHttpProtocol && targetUrl.origin !== window.location.origin) {
      return;
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
};
