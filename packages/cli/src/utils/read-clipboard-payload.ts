import { detectClipboardEnv, type ClipboardEnv } from "./detect-clipboard-env.js";
import { readClipboardMacos } from "./read-clipboard-macos.js";
import { readClipboardLinux } from "./read-clipboard-linux.js";
import { readClipboardWindows } from "./read-clipboard-windows.js";
import { readClipboardWsl } from "./read-clipboard-wsl.js";
import { parseReactGrabPayload, type ReactGrabPayload } from "./parse-react-grab-payload.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

export interface ReadClipboardPayloadResult {
  payload: ReactGrabPayload | null;
  env: ClipboardEnv;
  hint?: string;
  recoverable: boolean;
  // True iff the platform clipboard reader returned a non-empty raw string,
  // regardless of whether parseReactGrabPayload then accepted it. Lets the
  // log loop distinguish a genuinely empty clipboard from a transient
  // parse failure where a real React Grab payload sits on the clipboard
  // but the reader returned partial / corrupt output - critical so we
  // don't return a stale grab as if it were fresh.
  rawPayloadPresent: boolean;
}

const readRawByEnv = async (env: ClipboardEnv): Promise<ClipboardReadOutcome> => {
  switch (env) {
    case "macos":
      return readClipboardMacos();
    case "linux":
      return readClipboardLinux();
    case "windows":
      return readClipboardWindows();
    case "wsl":
      return readClipboardWsl();
    case "ssh":
      return {
        payload: null,
        hint: "Clipboard channel is unavailable in SSH sessions. Run `react-grab log` on the same machine as your browser.",
        recoverable: false,
      };
    default: {
      const exhaustiveCheck: never = env;
      return {
        payload: null,
        hint: `Unsupported clipboard environment: ${String(exhaustiveCheck)}`,
        recoverable: false,
      };
    }
  }
};

export const readClipboardPayload = async (): Promise<ReadClipboardPayloadResult> => {
  const env = detectClipboardEnv();
  const outcome = await readRawByEnv(env);
  const rawPayloadPresent = typeof outcome.payload === "string" && outcome.payload.length > 0;
  return {
    env,
    payload: parseReactGrabPayload(outcome.payload),
    hint: outcome.hint,
    recoverable: outcome.recoverable !== false,
    rawPayloadPresent,
  };
};
