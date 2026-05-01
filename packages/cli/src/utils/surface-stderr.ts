const extractStderr = (source: unknown): string | undefined => {
  if (typeof source === "string") return source;
  if (source instanceof Error && "stderr" in source && typeof source.stderr === "string") {
    return source.stderr;
  }
  return undefined;
};

export const surfaceStderr = (binary: string, source: unknown): void => {
  const stderr = extractStderr(source);
  if (!stderr) return;
  const trimmed = stderr.trim();
  if (trimmed.length > 0) {
    console.error(`[react-grab] ${binary} stderr: ${trimmed}`);
  }
};
