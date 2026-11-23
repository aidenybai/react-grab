import type { AgentLog } from "./agent-log.js";
import type { ITEM_STATUSES } from "./constants.js";

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export interface Env {
  AGENT_LOG: DurableObjectNamespace<AgentLog>;
  PUBLIC_URL?: string;
}

export interface StreamPosition {
  seq_num: number;
  timestamp: number;
}

export interface AppendRecordInput {
  headers: Record<string, unknown>;
  body: unknown;
}

export interface LogRecord {
  seq_num: number;
  timestamp: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface AppendAck {
  start: StreamPosition;
  end: StreamPosition;
  tail: StreamPosition;
}

export interface ReadOptions {
  seqNum?: number;
  tailOffset?: number;
  count: number;
  waitSeconds: number;
}

export interface ReadResult {
  records: LogRecord[];
  tail: StreamPosition;
}

export interface StatusUpdate {
  seq_num: number;
  timestamp: number;
  status: ItemStatus;
  note?: string;
}

export interface LogItem {
  seq_num: number;
  timestamp: number;
  status: ItemStatus;
  note?: string;
  comment: unknown;
  updates: StatusUpdate[];
}

export interface StatusRecordBody {
  ref: number;
  status: ItemStatus;
  note?: string;
}

export interface AgentPresence {
  state: "none" | "listening" | "working" | "offline";
  last_seen_at: number | null;
}

export interface LogSummary {
  created_at: number;
  tail: StreamPosition;
  counts: Record<ItemStatus, number>;
  agent: AgentPresence;
}

export interface NextItemResult {
  item: LogItem | null;
  tail: StreamPosition;
}

export interface AppendFailure {
  error: string;
}
