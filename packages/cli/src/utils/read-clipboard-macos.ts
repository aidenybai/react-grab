import { CLIPBOARD_READ_TIMEOUT_MS, REACT_GRAB_MIME_TYPE } from "./constants.js";
import { hasErrorCode } from "./has-error-code.js";
import { runExecFile } from "./run-exec-file.js";
import { surfaceStderr } from "./surface-stderr.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const JXA_SCRIPT = `(function(){ObjC.import('AppKit');var pasteboard=$.NSPasteboard.generalPasteboard;var data=pasteboard.dataForType('${REACT_GRAB_MIME_TYPE}');if(data.isNil())return '';var decoded=$.NSString.alloc.initWithDataEncoding(data,$.NSUTF8StringEncoding);return ObjC.unwrap(decoded);})()`;

export const readClipboardMacos = async (): Promise<ClipboardReadOutcome> => {
  try {
    const { stdout, stderr } = await runExecFile(
      "osascript",
      ["-l", "JavaScript", "-e", JXA_SCRIPT],
      { timeout: CLIPBOARD_READ_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
    );
    surfaceStderr("osascript", stderr);
    const trimmed = stdout.trimEnd();
    return { payload: trimmed.length > 0 ? trimmed : null };
  } catch (caughtError) {
    surfaceStderr("osascript", caughtError);
    if (hasErrorCode(caughtError, "ENOENT")) {
      return { payload: null, hint: "macOS requires `osascript` (preinstalled). Check $PATH." };
    }
    return { payload: null };
  }
};
