import { CLIPBOARD_READ_TIMEOUT_MS, REACT_GRAB_MIME_TYPE } from "./constants.js";
import { hasErrorCode } from "./has-error-code.js";
import { runExecFile } from "./run-exec-file.js";
import { surfaceStderr } from "./surface-stderr.js";
import type { ClipboardReadOutcome } from "./read-clipboard-outcome.js";

const POWERSHELL_SCRIPT = `
$ErrorActionPreference='Stop'
try {
  Add-Type -AssemblyName System.Windows.Forms
  $data = [System.Windows.Forms.Clipboard]::GetData('${REACT_GRAB_MIME_TYPE}')
  # Use UTF8Encoding($false) instead of [System.Text.Encoding]::UTF8 - the
  # singleton has emitUTF8Identifier enabled, which can prepend a BOM to the
  # piped stdout that breaks JSON.parse on the Node side.
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
  if ($null -eq $data) {
    [Console]::Out.Write('')
  } elseif ($data -is [byte[]]) {
    [Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($data))
  } elseif ($data -is [System.IO.Stream]) {
    # Browsers (Chromium, Edge) write web-custom-format clipboard data as a
    # raw UTF-8 byte stream. .NET's Clipboard.GetData returns a MemoryStream
    # for these unknown formats, so we read it to bytes and decode as UTF-8.
    if ($data.CanSeek) { $data.Position = 0 }
    $memoryStream = New-Object System.IO.MemoryStream
    $data.CopyTo($memoryStream)
    $bytes = $memoryStream.ToArray()
    [Console]::Out.Write([System.Text.Encoding]::UTF8.GetString($bytes))
  } elseif ($data -is [string]) {
    [Console]::Out.Write($data)
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
        recoverable: false,
      };
    }
    return { payload: null };
  }
};

export const readClipboardWindows = (): Promise<ClipboardReadOutcome> =>
  readClipboardViaWindowsPowerShell("powershell.exe");
