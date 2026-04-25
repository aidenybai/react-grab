import { CLIPBOARD_READ_TIMEOUT_MS, REACT_GRAB_MIME_TYPE } from "../constants.js";
import { hasErrorCode } from "./has-error-code.js";
import { runExecFile } from "./run-exec-file.js";
import { surfaceStderr } from "./surface-stderr.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const INSTALL_HINT =
  "Install a custom-MIME clipboard reader: `apt install xclip` (X11) or `apt install wl-clipboard` (Wayland).";

interface PlatformReadResult {
  stdout?: string;
  error?: unknown;
}

const tryRead = async (binary: string, binaryArgs: string[]): Promise<PlatformReadResult> => {
  try {
    const { stdout, stderr } = await runExecFile(binary, binaryArgs, {
      timeout: CLIPBOARD_READ_TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
    });
    surfaceStderr(binary, stderr);
    return { stdout };
  } catch (caughtError) {
    surfaceStderr(binary, caughtError);
    return { error: caughtError };
  }
};

const isBinaryMissing = (caughtError: unknown): boolean =>
  hasErrorCode(caughtError, "ENOENT") ||
  (caughtError instanceof Error && /not found/i.test(caughtError.message));

const trimToPayload = (stdout: string): string | null => {
  const trimmed = stdout.trimEnd();
  return trimmed.length > 0 ? trimmed : null;
};

export const readClipboardLinux = async (): Promise<ClipboardReadOutcome> => {
  if (process.env.WAYLAND_DISPLAY) {
    const waylandResult = await tryRead("wl-paste", ["-t", REACT_GRAB_MIME_TYPE, "-n"]);
    if (waylandResult.stdout !== undefined) {
      return { payload: trimToPayload(waylandResult.stdout) };
    }
    // Any wl-paste failure (missing binary or runtime error) falls through to
    // xclip - XWayland setups commonly surface custom MIME types via X11 even
    // when wl-paste cannot complete.
  }

  const x11Result = await tryRead("xclip", [
    "-selection",
    "clipboard",
    "-t",
    REACT_GRAB_MIME_TYPE,
    "-o",
  ]);
  if (x11Result.stdout !== undefined) {
    return { payload: trimToPayload(x11Result.stdout) };
  }
  if (isBinaryMissing(x11Result.error)) {
    return { payload: null, hint: INSTALL_HINT };
  }
  return { payload: null };
};
