import { readClipboardLinux } from "./read-clipboard-linux.js";
import { readClipboardViaWindowsPowerShell } from "./read-clipboard-windows.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const WSL_INTEROP_HINT =
  "Could not reach the Windows clipboard from WSL. Enable WSL interop (set `enabled = true` under `[interop]` in `/etc/wsl.conf`) or run `react-grab watch` on the Windows host.";

const combineHints = (...hints: (string | undefined)[]): string | undefined => {
  const present = hints.filter((hint): hint is string => Boolean(hint));
  return present.length > 0 ? present.join("\n\n") : undefined;
};

export const readClipboardWsl = async (): Promise<ClipboardReadOutcome> => {
  const hostOutcome = await readClipboardViaWindowsPowerShell("powershell.exe");
  if (hostOutcome.payload !== null) return hostOutcome;

  const wslgOutcome = await readClipboardLinux();
  if (wslgOutcome.payload !== null) return wslgOutcome;

  if (hostOutcome.hint) {
    // When interop is unreachable AND the WSLg fallback also has actionable
    // guidance (e.g. "install xclip"), surface both so the user can fix
    // whichever channel they prefer.
    return { payload: null, hint: combineHints(WSL_INTEROP_HINT, wslgOutcome.hint) };
  }
  return wslgOutcome;
};
