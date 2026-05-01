import { CLIPBOARD_READ_TIMEOUT_MS, REACT_GRAB_MIME_TYPE } from "./constants.js";
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

// Restrict the "binary missing" detection to ENOENT only. The previous
// /not found/i regex over `error.message` over-matched runtime stderr -
// `wl-paste` exits non-zero with messages like "No data found of type X" /
// "No selection" when the requested MIME just isn't on the clipboard right
// now, which would incorrectly route to the X11 fallback (or surface the
// misleading "install xclip" hint on Wayland-only systems).
const isBinaryMissing = (caughtError: unknown): boolean => hasErrorCode(caughtError, "ENOENT");

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
    // Only fall through to xclip when the wl-paste binary itself is
    // unavailable (ENOENT). A non-zero exit with a present binary means
    // the MIME type just isn't on the clipboard right now (common: user
    // hasn't grabbed yet) - treat that as an empty payload instead of
    // trying X11, which would ENOENT on Wayland-only systems and surface
    // a misleading "install xclip" hint.
    if (!isBinaryMissing(waylandResult.error)) {
      return { payload: null };
    }
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
    return { payload: null, hint: INSTALL_HINT, recoverable: false };
  }
  return { payload: null };
};
