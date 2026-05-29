import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PICKLE_ALIGN_BYTES = 4;
const GRAB_MIME = "application/x-react-grab";
const CHROMIUM_CUSTOM_FORMAT = "chromium/x-web-custom-data";
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

// Mirror of watch.mjs's parser: encode one base::Pickle string16 (uint32 length
// in UTF-16 code units, UTF-16LE bytes, padded to a 4-byte boundary).
const encodeString16 = (value) => {
  const valueBytes = Buffer.from(value, "utf16le");
  const lengthHeader = Buffer.alloc(4);
  lengthHeader.writeUInt32LE(value.length);
  const padding = (PICKLE_ALIGN_BYTES - (valueBytes.length % PICKLE_ALIGN_BYTES)) % PICKLE_ALIGN_BYTES;
  return Buffer.concat([lengthHeader, valueBytes, Buffer.alloc(padding)]);
};

export const encodeChromiumPickle = (formats) => {
  const entries = Object.entries(formats);
  const pairCount = Buffer.alloc(4);
  pairCount.writeUInt32LE(entries.length);
  const pairs = entries.flatMap(([format, value]) => [encodeString16(format), encodeString16(value)]);
  const body = Buffer.concat([pairCount, ...pairs]);
  const sizeHeader = Buffer.alloc(4);
  sizeHeader.writeUInt32LE(body.length);
  return Buffer.concat([sizeHeader, body]);
};

export const encodeGrabPickle = (grabJson) => encodeChromiumPickle({ [GRAB_MIME]: grabJson });

export const hasCommand = (name) => {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [name], { stdio: "ignore" }).status === 0;
};

export const canUseClipboard = () => {
  if (process.platform === "darwin") return hasCommand("pbcopy");
  if (process.platform === "linux") return hasCommand("xclip") && Boolean(process.env.DISPLAY);
  if (process.platform === "win32") return hasCommand("powershell") || hasCommand("pwsh");
  return false;
};

const powershell = () => (hasCommand("pwsh") ? "pwsh" : "powershell");

export const writeText = (text) => {
  if (process.platform === "darwin") return spawnSync("pbcopy", [], { input: text }).status === 0;
  if (process.platform === "linux") {
    // xclip forks a background server that keeps stdout/stderr open; ignore them
    // so spawnSync returns instead of waiting forever for EOF.
    return (
      spawnSync("xclip", ["-selection", "clipboard"], {
        input: text,
        stdio: ["pipe", "ignore", "ignore"],
      }).status === 0
    );
  }
  if (process.platform === "win32") {
    return (
      spawnSync(powershell(), ["-NoProfile", "-Command", "$input | Set-Clipboard"], { input: text })
        .status === 0
    );
  }
  return false;
};

// Writes a React Grab grab to the clipboard the way a browser would. macOS and
// Windows can offer the custom format alongside plain text; X11 xclip serves one
// target per invocation, so on Linux only the custom blob is offered.
export const writeGrab = ({ text, grabJson }) => {
  const pickle = encodeGrabPickle(grabJson);
  if (process.platform === "darwin") {
    const fixture = path.join(FIXTURES_DIR, "write-pasteboard.swift");
    return spawnSync("swift", [fixture, text], { input: pickle }).status === 0;
  }
  if (process.platform === "linux") {
    return (
      spawnSync("xclip", ["-selection", "clipboard", "-t", CHROMIUM_CUSTOM_FORMAT], {
        input: pickle,
        stdio: ["pipe", "ignore", "ignore"],
      }).status === 0
    );
  }
  if (process.platform === "win32") {
    const fixture = path.join(FIXTURES_DIR, "write-clipboard.ps1");
    return (
      spawnSync(powershell(), [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        fixture,
        text,
        pickle.toString("base64"),
      ]).status === 0
    );
  }
  return false;
};
