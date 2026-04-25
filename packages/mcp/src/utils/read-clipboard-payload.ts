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
        hint: "Clipboard channel is unavailable in SSH sessions. Run `react-grab-mcp` on the same machine as your browser.",
      };
    default: {
      const exhaustiveCheck: never = env;
      return {
        payload: null,
        hint: `Unsupported clipboard environment: ${String(exhaustiveCheck)}`,
      };
    }
  }
};

export const readClipboardPayload = async (): Promise<ReadClipboardPayloadResult> => {
  const env = detectClipboardEnv();
  const outcome = await readRawByEnv(env);
  return {
    env,
    payload: parseReactGrabPayload(outcome.payload),
    hint: outcome.hint,
  };
};
