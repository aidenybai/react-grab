import { readClipboardLinux } from "./read-clipboard-linux.js";
import { readClipboardViaWindowsPowerShell } from "./read-clipboard-windows.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const WSL_INTEROP_HINT =
  "Could not reach the Windows clipboard from WSL. Enable WSL interop (set `enabled = true` under `[interop]` in `/etc/wsl.conf`) or run `react-grab watch` on the Windows host.";

const combineHints = (...hints: (string | undefined)[]): string | undefined => {
  const present = hints.filter((hint): hint is string => Boolean(hint));
  return present.length > 0 ? present.join("\n\n") : undefined;
};

// Cheap check that a clipboard payload at least *looks* like a JSON object,
// so we don't fast-return host garbage (partial write, unrelated app putting
// custom data on the same MIME) and prevent the WSLg fallback from running.
// The downstream parser still validates against the React Grab schema.
const looksLikeJsonObject = (value: string): boolean => value.trimStart().startsWith("{");

export const readClipboardWsl = async (): Promise<ClipboardReadOutcome> => {
  const hostOutcome = await readClipboardViaWindowsPowerShell("powershell.exe");
  if (hostOutcome.payload !== null && looksLikeJsonObject(hostOutcome.payload)) {
    return hostOutcome;
  }

  const wslgOutcome = await readClipboardLinux();
  if (wslgOutcome.payload !== null && looksLikeJsonObject(wslgOutcome.payload)) {
    return wslgOutcome;
  }
  // If only one channel produced something (even garbage), prefer surfacing
  // it over `null` so the parser can emit its own diagnostic. Host wins ties.
  if (hostOutcome.payload !== null) return hostOutcome;
  if (wslgOutcome.payload !== null) return wslgOutcome;

  if (hostOutcome.hint) {
    // When interop is unreachable AND the WSLg fallback also has actionable
    // guidance (e.g. "install xclip"), surface both so the user can fix
    // whichever channel they prefer. Stay recoverable as long as either
    // channel is still capable of producing a payload - polling can recover
    // a transient empty clipboard on the working channel even if the other
    // is permanently broken.
    const bothChannelsUnrecoverable =
      hostOutcome.recoverable === false && wslgOutcome.recoverable === false;
    return {
      payload: null,
      hint: combineHints(WSL_INTEROP_HINT, wslgOutcome.hint),
      recoverable: !bothChannelsUnrecoverable,
    };
  }
  return wslgOutcome;
};
