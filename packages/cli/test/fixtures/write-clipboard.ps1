param([string]$Text, [string]$PickleBase64)

# Test fixture: emulate a browser writing React Grab data to the Windows
# clipboard. Offers CF_UNICODETEXT and the registered "Chromium Web Custom MIME
# Data Format" (the base::Pickle) together, in a single OpenClipboard session.

$ErrorActionPreference = "Stop"

$source = @"
using System;
using System.Runtime.InteropServices;

public static class RgWrite {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool OpenClipboard(IntPtr hWndNewOwner);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool EmptyClipboard();
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool CloseClipboard();
  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern uint RegisterClipboardFormat(string lpszFormat);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr GlobalAlloc(uint uFlags, UIntPtr dwBytes);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr GlobalLock(IntPtr hMem);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool GlobalUnlock(IntPtr hMem);

  private const uint GMEM_MOVEABLE = 0x0002;
  private const uint CF_UNICODETEXT = 13;

  private static IntPtr CopyToGlobal(byte[] data) {
    IntPtr handle = GlobalAlloc(GMEM_MOVEABLE, (UIntPtr)(uint)data.Length);
    IntPtr pointer = GlobalLock(handle);
    Marshal.Copy(data, 0, pointer, data.Length);
    GlobalUnlock(handle);
    return handle;
  }

  public static bool Write(string text, byte[] pickle) {
    if (!OpenClipboard(IntPtr.Zero)) return false;
    try {
      EmptyClipboard();
      byte[] textBytes = System.Text.Encoding.Unicode.GetBytes(text + "\0");
      SetClipboardData(CF_UNICODETEXT, CopyToGlobal(textBytes));
      uint customFormat = RegisterClipboardFormat("Chromium Web Custom MIME Data Format");
      SetClipboardData(customFormat, CopyToGlobal(pickle));
      return true;
    } finally {
      CloseClipboard();
    }
  }
}
"@

Add-Type -TypeDefinition $source -Language CSharp | Out-Null

$pickle = [System.Convert]::FromBase64String($PickleBase64)
if (-not [RgWrite]::Write($Text, $pickle)) {
  exit 1
}
