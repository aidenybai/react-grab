#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const POLL_INTERVAL_MS = 800;
const READ_TIMEOUT_MS = 2500;
const MAX_CLIPBOARD_BYTES = 64 * 1024 * 1024;
const ID_RADIX = 36;
const HASH_LENGTH = 12;
const PICKLE_HEADER_BYTES = 4;
const PICKLE_ALIGN_BYTES = 4;
const GRAB_MIME = "application/x-react-grab";
const CHROMIUM_CUSTOM_FORMAT = "chromium/x-web-custom-data";
// React Grab plain-text payloads always carry a component-stack frame such as
// "in LoginForm (at components/login-form.tsx:46:19)". Used to recognize a grab
// when the structured custom clipboard format is unavailable (text fallback).
const GRAB_TEXT_SIGNATURE = /\bin\s+\S+\s+\(at\s+.+?:\d+:\d+\)/;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    dir: path.join(os.tmpdir(), "react-grab-watch"),
    intervalMs: POLL_INTERVAL_MS,
    replayLast: false,
    textOnly: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dir") options.dir = args[(index += 1)];
    else if (arg === "--interval") options.intervalMs = Number(args[(index += 1)]);
    else if (arg === "--replay-last") options.replayLast = true;
    else if (arg === "--text-only") options.textOnly = true;
  }
  return options;
};

const sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

const shortHash = (text) => createHash("sha1").update(text).digest("hex").slice(0, HASH_LENGTH);

// Chromium serializes web custom data as a base::Pickle on every platform, only
// the clipboard format name differs. Layout (little-endian):
// [payloadSize u32][pairCount u32] then per pair:
// [len u32 in UTF-16 code units][utf16le string, padded to 4 bytes] x2 (format, data).
const alignUp = (value) => (value + PICKLE_ALIGN_BYTES - 1) & ~(PICKLE_ALIGN_BYTES - 1);

const parseChromiumPickle = (buffer) => {
  const formats = {};
  if (!buffer || buffer.length < PICKLE_HEADER_BYTES + 4) return formats;
  let offset = PICKLE_HEADER_BYTES;
  const pairCount = buffer.readUInt32LE(offset);
  offset += 4;
  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    if (offset + 4 > buffer.length) break;
    const formatCodeUnits = buffer.readUInt32LE(offset);
    offset += 4;
    if (offset + formatCodeUnits * 2 > buffer.length) break;
    const format = buffer.toString("utf16le", offset, offset + formatCodeUnits * 2);
    offset = alignUp(offset + formatCodeUnits * 2);
    if (offset + 4 > buffer.length) break;
    const dataCodeUnits = buffer.readUInt32LE(offset);
    offset += 4;
    if (offset + dataCodeUnits * 2 > buffer.length) break;
    const value = buffer.toString("utf16le", offset, offset + dataCodeUnits * 2);
    offset = alignUp(offset + dataCodeUnits * 2);
    formats[format] = value;
  }
  return formats;
};

const extractGrab = (raw) => {
  if (raw.grab) return raw.grab;
  if (raw.pickleBase64) return parseChromiumPickle(Buffer.from(raw.pickleBase64, "base64"))[GRAB_MIME];
  return undefined;
};

const isGrabText = (text) => GRAB_TEXT_SIGNATURE.test(text);

const hasCommand = (name) => {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [name], { stdio: "ignore" }).status === 0;
};

const runText = (command, args) => {
  const output = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_CLIPBOARD_BYTES,
    timeout: READ_TIMEOUT_MS,
  });
  return output.status === 0 ? output.stdout : null;
};

const runBuffer = (command, args) => {
  const output = spawnSync(command, args, {
    maxBuffer: MAX_CLIPBOARD_BYTES,
    timeout: READ_TIMEOUT_MS,
  });
  return output.status === 0 && output.stdout?.length ? output.stdout : null;
};

const runJson = (command, args) => {
  const output = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_CLIPBOARD_BYTES,
    timeout: READ_TIMEOUT_MS,
  });
  if (output.status !== 0 || !output.stdout) return null;
  try {
    return JSON.parse(output.stdout);
  } catch {
    return null;
  }
};

const compileSwiftReader = (workDir) => {
  if (!hasCommand("swiftc")) return null;
  const source = path.join(SCRIPT_DIR, "read-clipboard.swift");
  if (!fs.existsSync(source)) return null;
  const binary = path.join(workDir, "pbread");
  const isStale =
    !fs.existsSync(binary) || fs.statSync(source).mtimeMs > fs.statSync(binary).mtimeMs;
  if (isStale && spawnSync("swiftc", ["-O", source, "-o", binary]).status !== 0) return null;
  return binary;
};

const createDarwinReader = (options, workDir) => {
  const binary = options.textOnly ? null : compileSwiftReader(workDir);
  if (binary) {
    return {
      mode: "darwin-native",
      read: () => {
        const raw = runJson(binary, []);
        if (!raw) return null;
        return { changeCount: raw.changeCount ?? null, text: raw.text, grab: extractGrab(raw) };
      },
    };
  }
  if (!hasCommand("pbpaste")) return null;
  return {
    mode: "darwin-text",
    read: () => {
      const text = runText("pbpaste", []);
      return text == null ? null : { changeCount: null, text, grab: undefined };
    },
  };
};

const detectLinuxTool = () => {
  const preferWayland = Boolean(process.env.WAYLAND_DISPLAY) && hasCommand("wl-paste");
  if (preferWayland || (hasCommand("wl-paste") && !hasCommand("xclip"))) {
    return {
      name: "wl-paste",
      readText: () =>
        runText("wl-paste", ["-n", "-t", "text/plain"]) ?? runText("wl-paste", ["-n"]),
      readCustom: () => runBuffer("wl-paste", ["-n", "-t", CHROMIUM_CUSTOM_FORMAT]),
    };
  }
  if (hasCommand("xclip")) {
    return {
      name: "xclip",
      readText: () => runText("xclip", ["-selection", "clipboard", "-o"]),
      readCustom: () =>
        runBuffer("xclip", ["-selection", "clipboard", "-t", CHROMIUM_CUSTOM_FORMAT, "-o"]),
    };
  }
  if (hasCommand("xsel")) {
    return {
      name: "xsel",
      readText: () => runText("xsel", ["--clipboard", "--output"]),
      readCustom: null,
    };
  }
  return null;
};

const createLinuxReader = (options) => {
  const tool = detectLinuxTool();
  if (!tool) return null;
  const useCustom = !options.textOnly && Boolean(tool.readCustom);
  // X11/Wayland expose no clipboard sequence number, so the custom blob is only
  // re-read when the text changed, avoiding a second spawn on idle polls.
  let lastText = null;
  return {
    mode: useCustom ? `linux-${tool.name}` : `linux-${tool.name}-text`,
    read: () => {
      const text = tool.readText();
      if (text == null) return null;
      let grab;
      if (useCustom && text !== lastText) {
        grab = parseChromiumPickle(tool.readCustom())[GRAB_MIME];
      }
      lastText = text;
      return { changeCount: null, text, grab };
    },
  };
};

const detectPowershell = () =>
  hasCommand("pwsh") ? "pwsh" : hasCommand("powershell") ? "powershell" : null;

const createWindowsReader = (options) => {
  const shell = detectPowershell();
  if (!shell) return null;
  const scriptPath = path.join(SCRIPT_DIR, "read-clipboard.ps1");
  if (options.textOnly || !fs.existsSync(scriptPath)) {
    return {
      mode: "win-text",
      read: () => {
        const text = runText(shell, ["-NoProfile", "-Command", "Get-Clipboard -Raw"]);
        return text == null ? null : { changeCount: null, text, grab: undefined };
      },
    };
  }
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath];
  return {
    mode: "win-native",
    read: () => {
      const raw = runJson(shell, args);
      if (!raw) return null;
      return { changeCount: raw.changeCount ?? null, text: raw.text ?? undefined, grab: extractGrab(raw) };
    },
  };
};

const createReader = (options, workDir) => {
  if (process.platform === "darwin") return createDarwinReader(options, workDir);
  if (process.platform === "linux") return createLinuxReader(options);
  if (process.platform === "win32") return createWindowsReader(options);
  return null;
};

const emit = (line) => process.stdout.write(`${line}\n`);

const main = async () => {
  const options = parseArgs();
  fs.mkdirSync(options.dir, { recursive: true });
  const logPath = path.join(options.dir, "grabs.jsonl");

  const reader = createReader(options, options.dir);
  if (!reader) {
    emit(
      `REACT_GRAB_ERROR ${JSON.stringify({
        platform: process.platform,
        message:
          "No clipboard reader available. Linux: install xclip or wl-clipboard. macOS: install Xcode CLI tools (swiftc) or rely on pbpaste. Windows: ensure PowerShell is on PATH.",
      })}`,
    );
    process.exit(1);
  }
  const { read, mode } = reader;

  let lastChangeCount = null;
  let lastTimestamp = 0;
  let lastTextHash = "";
  let sequence = 0;

  // Baseline the current clipboard so restarting the watcher does not replay
  // whatever grab is already sitting on the clipboard.
  const initial = read();
  if (initial && !options.replayLast) {
    lastChangeCount = initial.changeCount;
    if (initial.text) lastTextHash = shortHash(initial.text);
    if (initial.grab) {
      try {
        lastTimestamp = JSON.parse(initial.grab).timestamp ?? 0;
      } catch {}
    }
  }

  emit(`REACT_GRAB_READY ${JSON.stringify({ mode, dir: options.dir, log: logPath })}`);

  while (true) {
    await sleep(options.intervalMs);
    const snapshot = read();
    if (!snapshot) continue;
    if (snapshot.changeCount !== null && snapshot.changeCount === lastChangeCount) continue;
    lastChangeCount = snapshot.changeCount;

    const textHash = snapshot.text ? shortHash(snapshot.text) : "";
    const didTextChange = textHash !== lastTextHash;
    lastTextHash = textHash;

    let record = null;
    if (snapshot.grab) {
      let parsed = null;
      try {
        parsed = JSON.parse(snapshot.grab);
      } catch {}
      if (parsed && parsed.timestamp > lastTimestamp) {
        lastTimestamp = parsed.timestamp;
        record = {
          source: "custom",
          timestamp: parsed.timestamp,
          version: parsed.version,
          content: parsed.content,
          entries: parsed.entries ?? [],
        };
      }
    } else if (didTextChange && snapshot.text && isGrabText(snapshot.text)) {
      record = { source: "text", timestamp: Date.now(), content: snapshot.text, entries: [] };
    }

    if (!record) continue;

    const id = `${record.timestamp}-${(sequence += 1).toString(ID_RADIX)}`;
    fs.appendFileSync(logPath, `${JSON.stringify({ id, receivedAt: Date.now(), ...record })}\n`);

    const firstEntry = record.entries[0];
    emit(
      `REACT_GRAB_NEW ${JSON.stringify({
        id,
        component: firstEntry?.componentName,
        tag: firstEntry?.tagName,
        count: record.entries.length || 1,
      })}`,
    );
  }
};

const isInvokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isInvokedDirectly) main();

export {
  parseChromiumPickle,
  extractGrab,
  isGrabText,
  createReader,
  detectLinuxTool,
  GRAB_MIME,
  CHROMIUM_CUSTOM_FORMAT,
};
