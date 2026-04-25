import { readClipboardLinux } from "./read-clipboard-linux.js";
import { readClipboardViaWindowsPowerShell } from "./read-clipboard-windows.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const WSL_INTEROP_HINT =
  "Could not reach the Windows clipboard from WSL. Enable WSL interop (set `enabled = true` under `[interop]` in `/etc/wsl.conf`) or run `react-grab-mcp` on the Windows host.";

export const readClipboardWsl = async (): Promise<ClipboardReadOutcome> => {
  const hostOutcome = await readClipboardViaWindowsPowerShell("powershell.exe");
  if (hostOutcome.payload !== null) return hostOutcome;

  const wslgOutcome = await readClipboardLinux();
  if (wslgOutcome.payload !== null) return wslgOutcome;

  if (hostOutcome.hint) return { payload: null, hint: WSL_INTEROP_HINT };
  return wslgOutcome;
};
