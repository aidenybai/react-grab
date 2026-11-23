export const LOG_ID_BYTE_LENGTH = 16;
export const MAX_RECORDS_PER_APPEND = 100;
export const MAX_RECORD_BODY_BYTES = 256 * 1024;
export const DEFAULT_READ_COUNT = 100;
export const MAX_READ_COUNT = 1000;
export const MAX_READ_WAIT_SECONDS = 60;
export const MAX_STATUS_NOTE_LENGTH = 2000;
export const AGENT_ACTIVE_WINDOW_MS = 10 * 60 * 1000;

export const RECORD_TYPE_COMMENT = "comment";
export const RECORD_TYPE_STATUS = "status";

export const ITEM_STATUSES = ["todo", "in_progress", "done", "error", "canceled"] as const;
export const DEFAULT_ITEM_STATUS = "todo";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
