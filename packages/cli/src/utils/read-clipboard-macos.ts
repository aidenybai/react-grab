import {
  CHROMIUM_PICKLE_SENTINEL,
  CLIPBOARD_READ_TIMEOUT_MS,
  REACT_GRAB_MIME_TYPE,
} from "./constants.js";
import { decodeChromiumWebCustomData } from "./decode-chromium-web-custom-data.js";
import { hasErrorCode } from "./has-error-code.js";
import { runExecFile } from "./run-exec-file.js";
import { surfaceStderr } from "./surface-stderr.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

// Chromium-family browsers (Chrome, Edge, Cursor, Electron) on macOS bundle
// web-custom-format clipboard data (anything the page wrote via
// clipboardData.setData(type, data) for a non-standard MIME type) into a
// single pasteboard entry under 'org.chromium.web-custom-data' rather than
// exposing the raw MIME ('application/x-react-grab') directly. A naive
// dataForType lookup returns nil and we'd never find the payload.
//
// 'org.webkit.web-custom-data' is included on a best-effort basis for Safari.
// Its exact binary layout was not verified at the time of writing; if Safari
// uses a different format the decoder will return null cleanly and watch
// will fall through to a normal "no payload" loop.
//
// JXA emits one of three forms to stdout for the Node side:
//  - empty string: nothing on the clipboard
//  - <utf-8 json>: direct read succeeded (Firefox / Safari direct exposure
//    or a future browser change)
//  - <CHROMIUM_PICKLE_SENTINEL><base64 of NSData>: the pasteboard exposed
//    web-custom-data; Node decodes the base::Pickle and extracts our entry.
//
// The sentinel uses 0x01 and 0x02 control bytes so it cannot collide with
// any direct-path payload (valid JSON cannot start with control bytes, and
// parseReactGrabPayload validates JSON shape downstream).
// JXA's Objective-C bridge in macOS Big Sur+ (the floor for `osascript -l
// JavaScript`) exposes Foundation selectors using camelCase for both
// single- and multi-argument forms (no trailing underscore for the final
// colon). The "underscore-per-colon" convention is documented in older
// Apple references but breaks at runtime on current macOS:
// `chromium.base64EncodedStringWithOptions_(0)` raises `is not a function`
// and `NSString.alloc.initWithData_encoding_(...)` returns an empty string,
// while the camelCase forms below are verified working on the macOS
// versions we ship to.
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
    return '${CHROMIUM_PICKLE_SENTINEL}' + ObjC.unwrap(chromium.base64EncodedStringWithOptions(0));
  }
  var webkit = pb.dataForType('org.webkit.web-custom-data');
  if (!webkit.isNil()) {
    return '${CHROMIUM_PICKLE_SENTINEL}' + ObjC.unwrap(webkit.base64EncodedStringWithOptions(0));
  }
  return '';
})()`;

const decodeJxaOutput = (raw: string): string | null => {
  if (raw.length === 0) return null;
  if (raw.startsWith(CHROMIUM_PICKLE_SENTINEL)) {
    const base64Pickle = raw.slice(CHROMIUM_PICKLE_SENTINEL.length);
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
