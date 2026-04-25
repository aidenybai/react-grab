import { readFileSync } from "node:fs";

export type ClipboardEnv = "ssh" | "wsl" | "macos" | "windows" | "linux";

const isInsideSshSession = (): boolean =>
  Boolean(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION);

const isInsideWsl = (): boolean => {
  if (process.env.WSL_DISTRO_NAME) return true;
  if (process.platform !== "linux") return false;

  try {
    const procVersionContents = readFileSync("/proc/version", "utf8");
    return /microsoft/i.test(procVersionContents);
  } catch {
    return false;
  }
};

export const detectClipboardEnv = (): ClipboardEnv => {
  if (isInsideSshSession()) return "ssh";
  if (isInsideWsl()) return "wsl";
  if (process.platform === "darwin") return "macos";
  if (process.platform === "win32") return "windows";
  return "linux";
};
