import { CLIPBOARD_READ_TIMEOUT_MS, REACT_GRAB_MIME_TYPE } from "./constants.js";
import { decodeChromiumWebCustomData } from "./decode-chromium-web-custom-data.js";
import { hasErrorCode } from "./has-error-code.js";
import { runExecFile } from "./run-exec-file.js";
import { surfaceStderr } from "./surface-stderr.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

// Chromium and WebKit on macOS bundle web-custom-format clipboard data
// (anything the page wrote via clipboardData.setData(type, data) for a
// non-standard MIME type) into a single pasteboard entry under either
// 'org.chromium.web-custom-data' or 'org.webkit.web-custom-data'. The
// raw MIME type ('application/x-react-grab') is NOT exposed directly on
// the macOS pasteboard, so a naive dataForType lookup returns nil and
// we'd never find the payload.
//
// JXA emits one of three forms for the Node side:
//  - empty string: nothing on the clipboard
//  - <utf-8 json>: direct read succeeded (Safari/Firefox direct exposure)
//  - <PICKLE_SENTINEL><base64 of NSData>: the pasteboard exposed
//    web-custom-data; Node decodes the base::Pickle and extracts our
//    MIME entry.
const PICKLE_SENTINEL = "__react_grab_chromium_pickle_b64__";

const JXA_SCRIPT = `(function(){
  ObjC.import('AppKit');
  var pb = $.NSPasteboard.generalPasteboard;
  var direct = pb.dataForType('${REACT_GRAB_MIME_TYPE}');
  if (!direct.isNil()) {
    var s = $.NSString.alloc.initWithDataEncoding(direct, $.NSUTF8StringEncoding);
    return ObjC.unwrap(s);
  }
  var chromium = pb.dataForType('org.chromium.web-custom-data');
  if (!chromium.isNil()) {
    return '${PICKLE_SENTINEL}' + ObjC.unwrap(chromium.base64EncodedStringWithOptions(0));
  }
  var webkit = pb.dataForType('org.webkit.web-custom-data');
  if (!webkit.isNil()) {
    return '${PICKLE_SENTINEL}' + ObjC.unwrap(webkit.base64EncodedStringWithOptions(0));
  }
  return '';
})()`;

const decodeJxaOutput = (raw: string): string | null => {
  if (raw.length === 0) return null;
  if (raw.startsWith(PICKLE_SENTINEL)) {
    const base64Pickle = raw.slice(PICKLE_SENTINEL.length);
    const buffer = Buffer.from(base64Pickle, "base64");
    return decodeChromiumWebCustomData(buffer, REACT_GRAB_MIME_TYPE);
  }
  return raw;
};

export const readClipboardMacos = async (): Promise<ClipboardReadOutcome> => {
  try {
    const { stdout, stderr } = await runExecFile(
      "osascript",
      ["-l", "JavaScript", "-e", JXA_SCRIPT],
      { timeout: CLIPBOARD_READ_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
    );
    surfaceStderr("osascript", stderr);
    const payload = decodeJxaOutput(stdout.trimEnd());
    return { payload };
  } catch (caughtError) {
    surfaceStderr("osascript", caughtError);
    if (hasErrorCode(caughtError, "ENOENT")) {
      return {
        payload: null,
        hint: "macOS requires `osascript` (preinstalled). Check $PATH.",
        recoverable: false,
      };
    }
    return { payload: null };
  }
};
