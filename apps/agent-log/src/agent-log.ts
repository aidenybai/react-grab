import { DurableObject } from "cloudflare:workers";
import {
  AGENT_ACTIVE_WINDOW_MS,
  DEFAULT_ITEM_STATUS,
  ITEM_STATUSES,
  MAX_RECORD_BODY_BYTES,
  MAX_STATUS_NOTE_LENGTH,
  RECORD_TYPE_COMMENT,
  RECORD_TYPE_STATUS,
} from "./constants.js";
import type {
  AgentPresence,
  AppendAck,
  AppendFailure,
  AppendRecordInput,
  Env,
  ItemStatus,
  LogItem,
  LogRecord,
  LogSummary,
  ReadOptions,
  ReadResult,
  NextItemResult,
  StreamPosition,
} from "./types.js";
import { isItemStatus } from "./utils/is-item-status.js";
import { isObjectRecord } from "./utils/is-object-record.js";

interface RecordRow extends Record<string, SqlStorageValue> {
  seq_num: number;
  timestamp: number;
  headers: string;
  body: string;
}

const parseRecordRow = (row: RecordRow): LogRecord => ({
  seq_num: row.seq_num,
  timestamp: row.timestamp,
  headers: JSON.parse(row.headers),
  body: JSON.parse(row.body),
});

const createEmptyCounts = (): Record<ItemStatus, number> => ({
  todo: 0,
  in_progress: 0,
  done: 0,
  error: 0,
  canceled: 0,
});

// Append-only log of records. Comments and their triage history are both
// records; the current status of each comment is a view folded from the log,
// so an agent can always replay why something ended up in its state.
export class AgentLog extends DurableObject<Env> {
  private readonly tailWaiters = new Set<() => void>();
  private listeningAgentCount = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS records (
        seq_num INTEGER PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        headers TEXT NOT NULL,
        body TEXT NOT NULL
      );
    `);
  }

  create(): number {
    const createdAt = Date.now();
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO meta (key, value) VALUES ('created_at', ?)",
      createdAt,
    );
    return this.getCreatedAt() ?? createdAt;
  }

  exists(): boolean {
    return this.getCreatedAt() !== null;
  }

  checkTail(): StreamPosition {
    const lastRow = this.ctx.storage.sql
      .exec<{ seq_num: number; timestamp: number }>(
        "SELECT seq_num, timestamp FROM records ORDER BY seq_num DESC LIMIT 1",
      )
      .toArray()[0];
    return lastRow
      ? { seq_num: lastRow.seq_num + 1, timestamp: lastRow.timestamp }
      : { seq_num: 0, timestamp: 0 };
  }

  append(inputs: AppendRecordInput[]): AppendAck | AppendFailure {
    const tailBefore = this.checkTail();
    const serializedRecords: Array<{ headers: string; body: string }> = [];

    for (const input of inputs) {
      const validationError = this.validateRecord(input, tailBefore.seq_num);
      if (validationError) return { error: validationError };
      const serializedBody = JSON.stringify(input.body ?? null);
      if (new TextEncoder().encode(serializedBody).byteLength > MAX_RECORD_BODY_BYTES) {
        return { error: `Record body exceeds ${MAX_RECORD_BODY_BYTES} bytes` };
      }
      serializedRecords.push({ headers: JSON.stringify(input.headers), body: serializedBody });
    }

    const timestamp = Math.max(Date.now(), tailBefore.timestamp);
    this.ctx.storage.transactionSync(() => {
      serializedRecords.forEach((serializedRecord, recordIndex) => {
        this.ctx.storage.sql.exec(
          "INSERT INTO records (seq_num, timestamp, headers, body) VALUES (?, ?, ?, ?)",
          tailBefore.seq_num + recordIndex,
          timestamp,
          serializedRecord.headers,
          serializedRecord.body,
        );
      });
    });

    if (inputs.some((input) => input.headers.type === RECORD_TYPE_STATUS)) this.markAgentSeen();
    const tail = this.checkTail();
    this.notifyTailWaiters();
    return {
      start: { seq_num: tailBefore.seq_num, timestamp },
      end: { seq_num: tailBefore.seq_num + serializedRecords.length, timestamp },
      tail,
    };
  }

  async read(options: ReadOptions): Promise<ReadResult> {
    const initialResult = this.readRecords(options);
    if (initialResult.records.length > 0 || options.waitSeconds <= 0) return initialResult;

    await this.waitForChange(options.waitSeconds * 1000);
    return this.readRecords({ ...options, seqNum: options.seqNum ?? initialResult.tail.seq_num });
  }

  // Claims the oldest todo comment for the calling agent, waiting for one to
  // arrive if none is open. Durable Objects run one request at a time between
  // awaits, so two agents woken by the same comment can never both claim it.
  async claimNext(waitSeconds: number): Promise<NextItemResult> {
    const deadline = Date.now() + waitSeconds * 1000;
    this.setListeningAgentCount(this.listeningAgentCount + 1);
    try {
      while (true) {
        const nextItem = this.listItems("todo")[0];
        if (nextItem) {
          this.append([
            {
              headers: { type: RECORD_TYPE_STATUS },
              body: { ref: nextItem.seq_num, status: "in_progress" },
            },
          ]);
          const claimedItem = this.listItems().find((item) => item.seq_num === nextItem.seq_num);
          return { item: claimedItem ?? null, tail: this.checkTail() };
        }
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) return { item: null, tail: this.checkTail() };
        await this.waitForChange(remainingMs);
      }
    } finally {
      this.setListeningAgentCount(this.listeningAgentCount - 1);
    }
  }

  getAgentPresence(): AgentPresence {
    const lastSeenAt = this.readMeta("agent_last_seen_at");
    if (this.listeningAgentCount > 0) return { state: "listening", last_seen_at: lastSeenAt };
    if (lastSeenAt === null) return { state: "none", last_seen_at: null };
    const isRecent = Date.now() - lastSeenAt < AGENT_ACTIVE_WINDOW_MS;
    return { state: isRecent ? "working" : "offline", last_seen_at: lastSeenAt };
  }

  listItems(statusFilter?: ItemStatus): LogItem[] {
    const itemsBySeqNum = new Map<number, LogItem>();

    for (const record of this.readAllRecords()) {
      const recordType = record.headers.type;
      if (recordType === RECORD_TYPE_COMMENT) {
        itemsBySeqNum.set(record.seq_num, {
          seq_num: record.seq_num,
          timestamp: record.timestamp,
          status: DEFAULT_ITEM_STATUS,
          comment: record.body,
          updates: [],
        });
        continue;
      }
      if (recordType !== RECORD_TYPE_STATUS || !isObjectRecord(record.body)) continue;
      const targetItem = itemsBySeqNum.get(Number(record.body.ref));
      if (!targetItem || !isItemStatus(record.body.status)) continue;
      const note = typeof record.body.note === "string" ? record.body.note : undefined;
      targetItem.status = record.body.status;
      targetItem.note = note;
      targetItem.updates.push({
        seq_num: record.seq_num,
        timestamp: record.timestamp,
        status: record.body.status,
        note,
      });
    }

    const items = [...itemsBySeqNum.values()];
    return statusFilter ? items.filter((item) => item.status === statusFilter) : items;
  }

  summarize(): LogSummary {
    const counts = createEmptyCounts();
    for (const item of this.listItems()) counts[item.status] += 1;
    return {
      created_at: this.getCreatedAt() ?? 0,
      tail: this.checkTail(),
      counts,
      agent: this.getAgentPresence(),
    };
  }

  private getCreatedAt(): number | null {
    return this.readMeta("created_at");
  }

  private readMeta(key: string): number | null {
    const row = this.ctx.storage.sql
      .exec<{ value: number }>("SELECT value FROM meta WHERE key = ?", key)
      .toArray()[0];
    return row ? row.value : null;
  }

  private markAgentSeen() {
    this.ctx.storage.sql.exec(
      "INSERT INTO meta (key, value) VALUES ('agent_last_seen_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      Date.now(),
    );
  }

  // Presence isn't a record, so readers waiting at the tail are woken
  // explicitly; the toolbar re-reads the agent state when its poll returns.
  private setListeningAgentCount(nextCount: number) {
    const didPresenceChange = this.listeningAgentCount > 0 !== nextCount > 0;
    this.listeningAgentCount = nextCount;
    this.markAgentSeen();
    if (didPresenceChange) this.notifyTailWaiters();
  }

  private waitForChange(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const finishWaiting = () => {
        clearTimeout(timeoutId);
        this.tailWaiters.delete(finishWaiting);
        resolve();
      };
      const timeoutId = setTimeout(finishWaiting, timeoutMs);
      this.tailWaiters.add(finishWaiting);
    });
  }

  private validateRecord(input: AppendRecordInput, tailSeqNum: number): string | null {
    if (!isObjectRecord(input.headers)) return "Record headers must be an object";
    for (const headerValue of Object.values(input.headers)) {
      if (typeof headerValue !== "string") return "Record header values must be strings";
    }
    if (input.headers.type !== RECORD_TYPE_STATUS) return null;

    const body = input.body;
    if (!isObjectRecord(body)) return "Status record body must be an object";
    if (!isItemStatus(body.status)) {
      return `Status must be one of: ${ITEM_STATUSES.join(", ")}`;
    }
    if (body.note !== undefined && typeof body.note !== "string") return "Note must be a string";
    if (typeof body.note === "string" && body.note.length > MAX_STATUS_NOTE_LENGTH) {
      return `Note exceeds ${MAX_STATUS_NOTE_LENGTH} characters`;
    }
    const referencedSeqNum = body.ref;
    if (
      typeof referencedSeqNum !== "number" ||
      !Number.isInteger(referencedSeqNum) ||
      referencedSeqNum < 0 ||
      referencedSeqNum >= tailSeqNum
    ) {
      return "Status record ref must be the seq_num of an existing comment";
    }
    const referencedRow = this.ctx.storage.sql
      .exec<{ headers: string }>("SELECT headers FROM records WHERE seq_num = ?", referencedSeqNum)
      .toArray()[0];
    const referencedHeaders: unknown = referencedRow ? JSON.parse(referencedRow.headers) : null;
    if (!isObjectRecord(referencedHeaders) || referencedHeaders.type !== RECORD_TYPE_COMMENT) {
      return "Status record ref must be the seq_num of an existing comment";
    }
    return null;
  }

  private resolveStartSeqNum(options: ReadOptions, tailSeqNum: number): number {
    if (options.seqNum !== undefined) return options.seqNum;
    if (options.tailOffset !== undefined) return Math.max(0, tailSeqNum - options.tailOffset);
    return 0;
  }

  private readRecords(options: ReadOptions): ReadResult {
    const tail = this.checkTail();
    const startSeqNum = this.resolveStartSeqNum(options, tail.seq_num);
    const records = this.ctx.storage.sql
      .exec<RecordRow>(
        "SELECT seq_num, timestamp, headers, body FROM records WHERE seq_num >= ? ORDER BY seq_num LIMIT ?",
        startSeqNum,
        options.count,
      )
      .toArray()
      .map(parseRecordRow);
    return { records, tail };
  }

  private readAllRecords(): LogRecord[] {
    return this.ctx.storage.sql
      .exec<RecordRow>("SELECT seq_num, timestamp, headers, body FROM records ORDER BY seq_num")
      .toArray()
      .map(parseRecordRow);
  }

  private notifyTailWaiters() {
    const waiters = [...this.tailWaiters];
    this.tailWaiters.clear();
    for (const notifyWaiter of waiters) notifyWaiter();
  }
}
