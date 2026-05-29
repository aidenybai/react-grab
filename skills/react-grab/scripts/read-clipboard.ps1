# Windows clipboard reader for the React Grab watcher. Reads CF_UNICODETEXT and
# the registered "Chromium Web Custom MIME Data Format" (a base::Pickle of web
# custom data) via Win32, in a single OpenClipboard so the two reads are
# consistent. Emits { changeCount, text, pickleBase64 } as JSON; watch.mjs
# decodes the pickle (shared with macOS/Linux). GetClipboardSequenceNumber gives
# a cheap monotonic change token for idle polling.

$ErrorActionPreference = "Stop"

$source = @"
using System;
using System.Runtime.InteropServices;

public static class RgClip {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool OpenClipboard(IntPtr hWndNewOwner);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool CloseClipboard();
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr GetClipboardData(uint uFormat);
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern uint RegisterClipboardFormat(string lpszFormat);
  [DllImport("user32.dll")]
  public static extern uint GetClipboardSequenceNumber();
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool IsClipboardFormatAvailable(uint format);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr GlobalLock(IntPtr hMem);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool GlobalUnlock(IntPtr hMem);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern UIntPtr GlobalSize(IntPtr hMem);

  private const uint CF_UNICODETEXT = 13;

  private static byte[] ReadLocked(uint format) {
    if (!IsClipboardFormatAvailable(format)) return null;
    IntPtr handle = GetClipboardData(format);
    if (handle == IntPtr.Zero) return null;
    IntPtr pointer = GlobalLock(handle);
    if (pointer == IntPtr.Zero) return null;
    try {
      ulong size = GlobalSize(handle).ToUInt64();
      if (size == 0 || size > int.MaxValue) return null;
      byte[] bytes = new byte[(int)size];
      Marshal.Copy(pointer, bytes, 0, (int)size);
      return bytes;
    } finally {
      GlobalUnlock(handle);
    }
  }

  public static byte[][] ReadAll(uint customFormat) {
    byte[][] result = new byte[2][];
    if (!OpenClipboard(IntPtr.Zero)) return result;
    try {
      result[0] = ReadLocked(CF_UNICODETEXT);
      result[1] = ReadLocked(customFormat);
    } finally {
      CloseClipboard();
    }
    return result;
  }
}
"@

# Add-Type recompiles on every process start, so the reader is compiled to a
# cached assembly once and merely loaded on subsequent polls.
$cacheDir = Join-Path $env:TEMP "react-grab-watch"
$cachedDll = Join-Path $cacheDir "RgClipReader.dll"
$loaded = $false
if (Test-Path $cachedDll) {
  try { Add-Type -Path $cachedDll | Out-Null; $loaded = $true } catch {}
}
if (-not $loaded) {
  try {
    New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
    Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly $cachedDll -ErrorAction Stop | Out-Null
    Add-Type -Path $cachedDll | Out-Null
    $loaded = $true
  } catch {}
}
if (-not $loaded) {
  Add-Type -TypeDefinition $source -Language CSharp | Out-Null
}

$changeCount = [RgClip]::GetClipboardSequenceNumber()
$customFormat = [RgClip]::RegisterClipboardFormat("Chromium Web Custom MIME Data Format")
$blobs = [RgClip]::ReadAll($customFormat)

$text = $null
if ($null -ne $blobs[0]) {
  $text = [System.Text.Encoding]::Unicode.GetString($blobs[0]).TrimEnd([char]0)
}

$pickleBase64 = $null
if ($null -ne $blobs[1]) {
  $pickleBase64 = [System.Convert]::ToBase64String($blobs[1])
}

$payload = [ordered]@{
  changeCount  = [int64]$changeCount
  text         = $text
  pickleBase64 = $pickleBase64
}

$payload | ConvertTo-Json -Compress
