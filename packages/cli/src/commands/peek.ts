import path from "node:path";
import { Command } from "commander";
import {
  createReader,
  extractPrompt,
  isGrabText,
  NO_READER_MESSAGE,
  prepareWorkDir,
} from "../utils/clipboard.js";
import { DEFAULT_WATCH_DIR } from "../utils/constants.js";

interface PeekOptions {
  dir: string;
  textOnly?: boolean;
}

interface GrabPayload {
  timestamp?: number;
  version?: string;
  content?: unknown;
  entries?: unknown;
  implicit?: boolean;
}

const fail = (message: string): never => {
  process.stderr.write(`react-grab peek: ${message}\n`);
  process.exit(1);
};

export const peek = new Command()
  .name("peek")
  .description(
    "read the current clipboard once and print it if it contains a React Grab grab (no daemon needed)",
  )
  .option("-d, --dir <dir>", "work dir for the compiled native binary", DEFAULT_WATCH_DIR)
  .option("--text-only", "skip the native reader and use the plain-text fallback")
  .action((options: PeekOptions) => {
    const dir = path.resolve(options.dir);

    try {
      prepareWorkDir(dir);
    } catch (error) {
      fail(String((error as Error)?.message ?? error));
    }

    const reader = createReader({ textOnly: Boolean(options.textOnly), workDir: dir });
    if (!reader) {
      fail(NO_READER_MESSAGE);
    }

    const snapshot = reader.read();
    if (!snapshot) {
      process.exit(0);
    }

    let parsedGrab: GrabPayload | null = null;
    if (snapshot.grab) {
      try {
        parsedGrab = JSON.parse(snapshot.grab) as GrabPayload;
      } catch {}
    }

    if (parsedGrab && typeof parsedGrab.timestamp === "number") {
      const record: Record<string, unknown> = {
        source: parsedGrab.implicit ? "viewport" : "custom",
        timestamp: parsedGrab.timestamp,
        version: typeof parsedGrab.version === "string" ? parsedGrab.version : undefined,
        content: typeof parsedGrab.content === "string" ? parsedGrab.content : "",
        entries: Array.isArray(parsedGrab.entries) ? parsedGrab.entries : [],
        implicit: Boolean(parsedGrab.implicit),
        id: `peek-${parsedGrab.timestamp}`,
        receivedAt: Date.now(),
      };
      const prompt = extractPrompt(record);
      if (prompt) record.prompt = prompt;
      process.stdout.write(`${JSON.stringify(record)}\n`, () => process.exit(0));
      return;
    }

    if (snapshot.text && isGrabText(snapshot.text)) {
      const now = Date.now();
      const record = {
        source: "text",
        timestamp: now,
        content: snapshot.text,
        entries: [],
        implicit: false,
        id: `peek-${now}`,
        receivedAt: now,
      };
      process.stdout.write(`${JSON.stringify(record)}\n`, () => process.exit(0));
      return;
    }

    process.exit(0);
  });
