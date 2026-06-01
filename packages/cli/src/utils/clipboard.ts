import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sleep } from "./sleep.js";

export const HISTORY_FILE_NAME = "history.jsonl";

export const NO_READER_MESSAGE =
  "no clipboard reader available. Linux: install xclip or wl-clipboard. macOS: install Xcode CLI tools (swiftc) or rely on pbpaste. Windows: ensure PowerShell is on PATH.";

// Native readers (read-clipboard.swift / .ps1) are copied next to the compiled
// CLI at build time (see scripts/copy-native-readers.mjs).
const READERS_DIR = path.dirname(fileURLToPath(import.meta.url));

const READ_TIMEOUT_MS = 2500;
const MAX_CLIPBOARD_BYTES = 64 * 1024 * 1024;
const ID_RADIX = 36;
const HASH_LENGTH = 12;
const PICKLE_HEADER_BYTES = 4;
const PICKLE_ALIGN_BYTES = 4;
const SIGNATURE_SCAN_CHARS = 32 * 1024;

export const GRAB_MIME = "application/x-react-grab";
const CHROMIUM_CUSTOM_FORMAT = "chromium/x-web-custom-data";

// React Grab plain-text payloads always carry a component-stack frame such as
// "in LoginForm (at components/login-form.tsx:46:19)". Used to recognize a grab
// when the structured custom clipboard format is unavailable (text fallback).
// `[^\n]{1,400}?` allows parentheses in paths (e.g. Next.js route groups
// `(auth)`) while bounding backtracking on hostile clipboard text.
const GRAB_TEXT_SIGNATURE = /\bin\s+\S+\s+\(at\s+[^\n]{1,400}?:\d+:\d+\)/;

interface GrabEntry {
  tagName?: string;
  componentName?: string;
  content?: string;
  commentText?: string;
}

interface GrabRecord {
  source: "custom" | "text";
  timestamp: number;
  version?: string;
  content: string;
  entries: GrabEntry[];
  prompt?: string;
}

interface CapturedGrab extends GrabRecord {
  id: string;
  receivedAt: number;
}

// What a platform reader returns each poll. `grab` is the resolved
// application/x-react-grab JSON string when present.
interface ClipboardSnapshot {
  changeCount: number | null;
  text?: string;
  grab?: string;
}

// What the native helpers (Swift/PowerShell) emit; the watcher resolves `grab`
// from `grab` directly or by decoding `pickleBase64`.
interface NativeRead {
  changeCount?: number | null;
  text?: string;
  grab?: string;
  pickleBase64?: string;
}

interface ClipboardReader {
  mode: string;
  read: () => ClipboardSnapshot | null;
}

interface LinuxTool {
  name: string;
  readText: () => string | null;
  readCustom: (() => Buffer | null) | null;
}

interface CreateReaderOptions {
  textOnly: boolean;
  // Writable directory for the compiled native binary (e.g. macOS `pbread`).
  workDir: string;
}

const shortHash = (text: string): string =>
  createHash("sha1").update(text).digest("hex").slice(0, HASH_LENGTH);

// Chromium serializes web custom data as a base::Pickle on every platform, only
// the clipboard format name differs. Layout (little-endian):
// [payloadSize u32][pairCount u32] then per pair:
// [len u32 in UTF-16 code units][utf16le string, padded to 4 bytes] x2 (format, data).
const alignUp = (value: number): number =>
  (value + PICKLE_ALIGN_BYTES - 1) & ~(PICKLE_ALIGN_BYTES - 1);

export const parseChromiumPickle = (buffer: Buffer | null | undefined): Record<string, string> => {
  const formats: Record<string, string> = {};
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

export const extractGrab = (raw: NativeRead): string | undefined => {
  if (raw.grab) return raw.grab;
  if (raw.pickleBase64)
    return parseChromiumPickle(Buffer.from(raw.pickleBase64, "base64"))[GRAB_MIME];
  return undefined;
};

export const isGrabText = (text: string): boolean =>
  GRAB_TEXT_SIGNATURE.test(
    text.length > SIGNATURE_SCAN_CHARS ? text.slice(0, SIGNATURE_SCAN_CHARS) : text,
  );

// A grab can carry the user's own instruction (React Grab prompt mode). It lives
// in entries[].commentText when structured, otherwise it is prepended above the
// bracketed element references in `content`. Returns that comment, or undefined.
export const extractPrompt = (record: {
  entries?: unknown;
  content?: unknown;
}): string | undefined => {
  const entries = Array.isArray(record.entries) ? (record.entries as GrabEntry[]) : [];
  const comments = entries.map((entry) => entry?.commentText?.trim?.()).filter(Boolean);
  if (comments.length > 0) return comments.join("\n");
  const content = typeof record.content === "string" ? record.content : "";
  const lines = content.split("\n");
  const firstReferenceLine = lines.findIndex((line) => line.startsWith("["));
  if (firstReferenceLine <= 0) return undefined;
  return lines.slice(0, firstReferenceLine).join("\n").trim() || undefined;
};

const hasCommand = (name: string): boolean => {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [name], { stdio: "ignore" }).status === 0;
};

const runText = (command: string, args: string[]): string | null => {
  const output = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_CLIPBOARD_BYTES,
    timeout: READ_TIMEOUT_MS,
  });
  return output.status === 0 ? output.stdout : null;
};

const runBuffer = (command: string, args: string[]): Buffer | null => {
  const output = spawnSync(command, args, {
    maxBuffer: MAX_CLIPBOARD_BYTES,
    timeout: READ_TIMEOUT_MS,
  });
  return output.status === 0 && output.stdout?.length ? output.stdout : null;
};

const runJson = (command: string, args: string[]): NativeRead | null => {
  const output = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_CLIPBOARD_BYTES,
    timeout: READ_TIMEOUT_MS,
  });
  if (output.status !== 0 || !output.stdout) return null;
  try {
    return JSON.parse(output.stdout) as NativeRead;
  } catch {
    return null;
  }
};

const compileSwiftReader = (readersDir: string, workDir: string): string | null => {
  if (!hasCommand("swiftc")) return null;
  const source = path.join(readersDir, "read-clipboard.swift");
  if (!fs.existsSync(source)) return null;
  const binary = path.join(workDir, "pbread");
  const isStale =
    !fs.existsSync(binary) || fs.statSync(source).mtimeMs > fs.statSync(binary).mtimeMs;
  if (isStale && spawnSync("swiftc", ["-O", source, "-o", binary]).status !== 0) return null;
  return binary;
};

const createDarwinReader = (options: CreateReaderOptions): ClipboardReader | null => {
  const binary = options.textOnly ? null : compileSwiftReader(READERS_DIR, options.workDir);
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

export const detectLinuxTool = (): LinuxTool | null => {
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

const createLinuxReader = (options: CreateReaderOptions): ClipboardReader | null => {
  const tool = detectLinuxTool();
  if (!tool) return null;
  const useCustom = !options.textOnly && Boolean(tool.readCustom);
  return {
    mode: useCustom ? `linux-${tool.name}` : `linux-${tool.name}-text`,
    read: () => {
      const text = tool.readText();
      if (text == null) return null;
      // No clipboard sequence number on X11/Wayland, so always read the custom
      // blob; its timestamp dedups re-grabs of the identical element.
      const grab =
        useCustom && tool.readCustom
          ? parseChromiumPickle(tool.readCustom())[GRAB_MIME]
          : undefined;
      return { changeCount: null, text, grab };
    },
  };
};

const detectPowershell = (): string | null =>
  hasCommand("pwsh") ? "pwsh" : hasCommand("powershell") ? "powershell" : null;

const createWindowsReader = (options: CreateReaderOptions): ClipboardReader | null => {
  const shell = detectPowershell();
  if (!shell) return null;
  const scriptPath = path.join(READERS_DIR, "read-clipboard.ps1");
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
  // Warm the cached C# compile once (untimed) so the first timed poll does not
  // race the first-run compile and kill it.
  spawnSync(shell, args, { stdio: "ignore", maxBuffer: MAX_CLIPBOARD_BYTES });
  return {
    mode: "win-native",
    read: () => {
      const raw = runJson(shell, args);
      if (!raw) return null;
      return {
        changeCount: raw.changeCount ?? null,
        text: raw.text ?? undefined,
        grab: extractGrab(raw),
      };
    },
  };
};

export const createReader = (options: CreateReaderOptions): ClipboardReader | null => {
  if (process.platform === "darwin") return createDarwinReader(options);
  if (process.platform === "linux") return createLinuxReader(options);
  if (process.platform === "win32") return createWindowsReader(options);
  return null;
};

// On a shared host an attacker could pre-create the work dir (or its log as a
// symlink) to redirect appends; refuse anything we do not own.
const ensureSafeDir = (dir: string): void => {
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(dir);
  } catch {
    return;
  }
  if (stats.isSymbolicLink()) throw new Error(`Refusing to use ${dir}: it is a symlink.`);
  if (process.getuid && stats.uid !== process.getuid()) {
    throw new Error(`Refusing to use ${dir}: owned by another user.`);
  }
};

// Creates the work dir and drops a self-ignoring .gitignore so the captured
// history never lands in the user's repo.
export const prepareWorkDir = (dir: string): void => {
  ensureSafeDir(dir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const gitignore = path.join(dir, ".gitignore");
  if (!fs.existsSync(gitignore)) fs.writeFileSync(gitignore, "*\n");
};

interface RunWatchLoopOptions {
  reader: ClipboardReader;
  dir: string;
  intervalMs: number;
  replayLast: boolean;
  onWarn?: (message: string) => void;
}

// Baselines the current clipboard first so a grab already sitting there is not
// replayed (unless replayLast), then appends each newly captured grab forever.
export const runWatchLoop = async (options: RunWatchLoopOptions): Promise<void> => {
  const { reader, dir, intervalMs, replayLast, onWarn } = options;
  const logPath = path.join(dir, HISTORY_FILE_NAME);
  const { read } = reader;

  let lastChangeCount: number | null = null;
  let lastTimestamp = 0;
  let lastTextHash = "";
  let lastErrorMessage = "";
  let sequence = 0;

  const initial = read();
  if (initial && !replayLast) {
    lastChangeCount = initial.changeCount;
    if (initial.text) lastTextHash = shortHash(initial.text);
    if (initial.grab) {
      try {
        lastTimestamp = (JSON.parse(initial.grab) as { timestamp?: number }).timestamp ?? 0;
      } catch {}
    }
  }

  while (true) {
    await sleep(intervalMs);
    // Clipboard payloads are untrusted (any web page can forge one), so a single
    // malformed/hostile grab must never crash the loop. Distinct errors surface
    // via onWarn so a persistent failure is diagnosable rather than silent.
    try {
      const snapshot = read();
      if (!snapshot) continue;
      if (snapshot.changeCount !== null && snapshot.changeCount === lastChangeCount) continue;

      const textHash = snapshot.text ? shortHash(snapshot.text) : "";
      const didTextChange = textHash !== lastTextHash;

      let record: GrabRecord | null = null;
      let nextTimestamp = lastTimestamp;
      if (snapshot.grab) {
        let parsed: {
          timestamp?: number;
          version?: string;
          content?: unknown;
          entries?: unknown;
        } | null = null;
        try {
          parsed = JSON.parse(snapshot.grab);
        } catch {}
        if (parsed && typeof parsed.timestamp === "number" && parsed.timestamp > lastTimestamp) {
          nextTimestamp = parsed.timestamp;
          record = {
            source: "custom",
            timestamp: parsed.timestamp,
            version: typeof parsed.version === "string" ? parsed.version : undefined,
            content: typeof parsed.content === "string" ? parsed.content : "",
            entries: Array.isArray(parsed.entries) ? (parsed.entries as GrabEntry[]) : [],
          };
        }
      } else if (didTextChange && snapshot.text && isGrabText(snapshot.text)) {
        record = { source: "text", timestamp: Date.now(), content: snapshot.text, entries: [] };
      }

      if (!record) {
        // The clipboard changed but carried no new grab; advance the dedup
        // state so the same content is not re-scanned every poll.
        lastChangeCount = snapshot.changeCount;
        lastTextHash = textHash;
        continue;
      }

      const prompt = extractPrompt(record);
      if (prompt) record.prompt = prompt;

      const captured: CapturedGrab = {
        id: `${record.timestamp}-${(sequence += 1).toString(ID_RADIX)}`,
        receivedAt: Date.now(),
        ...record,
      };
      // Commit the dedup state only after the write succeeds; a failed append
      // must leave the grab eligible for retry on the next poll, not lost.
      fs.appendFileSync(logPath, `${JSON.stringify(captured)}\n`);
      lastChangeCount = snapshot.changeCount;
      lastTextHash = textHash;
      lastTimestamp = nextTimestamp;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      if (message !== lastErrorMessage) {
        lastErrorMessage = message;
        onWarn?.(message);
      }
    }
  }
};
