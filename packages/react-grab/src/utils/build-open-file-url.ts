const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://react-grab.com"
    : "http://localhost:3000";

export const buildOpenFileUrl = (
  filePath: string,
  lineNumber?: number,
): string => {
  const lineParam = lineNumber ? `&line=${lineNumber}` : "";
  return `${BASE_URL}/open-file?url=${encodeURIComponent(filePath)}${lineParam}`;
};
