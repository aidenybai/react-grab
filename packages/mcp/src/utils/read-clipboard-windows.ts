import { CLIPBOARD_READ_TIMEOUT_MS, REACT_GRAB_MIME_TYPE } from "../constants.js";
import { hasErrorCode } from "./has-error-code.js";
import { runExecFile } from "./run-exec-file.js";
import { surfaceStderr } from "./surface-stderr.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const POWERSHELL_SCRIPT = `
$ErrorActionPreference='Stop'
try {
  Add-Type -AssemblyName System.Windows.Forms
  $data = [System.Windows.Forms.Clipboard]::GetData('${REACT_GRAB_MIME_TYPE}')
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  if ($null -eq $data) {
    [Console]::Out.Write('')
  } elseif ($data -is [byte[]]) {
    [Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($data))
  } else {
    [Console]::Out.Write($data.ToString())
  }
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;

const ENCODED_POWERSHELL_COMMAND = Buffer.from(POWERSHELL_SCRIPT, "utf16le").toString("base64");

export const readClipboardViaWindowsPowerShell = async (
  binary: string,
): Promise<ClipboardReadOutcome> => {
  try {
    const { stdout, stderr } = await runExecFile(
      binary,
      ["-NoProfile", "-NonInteractive", "-Sta", "-EncodedCommand", ENCODED_POWERSHELL_COMMAND],
      { timeout: CLIPBOARD_READ_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
    );
    surfaceStderr(binary, stderr);
    const trimmed = stdout.trimEnd();
    return { payload: trimmed.length > 0 ? trimmed : null };
  } catch (caughtError) {
    surfaceStderr(binary, caughtError);
    if (hasErrorCode(caughtError, "ENOENT")) {
      return {
        payload: null,
        hint: `Cannot launch ${binary}. Ensure Windows PowerShell is on PATH.`,
      };
    }
    return { payload: null };
  }
};

export const readClipboardWindows = (): Promise<ClipboardReadOutcome> =>
  readClipboardViaWindowsPowerShell("powershell.exe");
