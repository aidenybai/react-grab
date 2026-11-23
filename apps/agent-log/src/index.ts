import {
  CORS_HEADERS,
  DEFAULT_READ_COUNT,
  ITEM_STATUSES,
  LOG_ID_BYTE_LENGTH,
  MAX_READ_COUNT,
  MAX_READ_WAIT_SECONDS,
  MAX_RECORDS_PER_APPEND,
  RECORD_TYPE_STATUS,
} from "./constants.js";
import { renderGuide } from "./render-guide.js";
import type { AppendAck, AppendFailure, AppendRecordInput, Env } from "./types.js";
import { isItemStatus } from "./utils/is-item-status.js";
import { isObjectRecord } from "./utils/is-object-record.js";

export { AgentLog } from "./agent-log.js";

const LOG_PATH_PATTERN = /^\/logs\/([A-Za-z0-9_-]+)(\/.*)?$/;
const ITEM_STATUS_PATH_PATTERN = /^\/items\/(\d+)\/status$/;

const respondJson = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });

const respondError = (message: string, status: number): Response =>
  respondJson({ error: message }, status);

const respondAppendResult = (result: AppendAck | AppendFailure): Response =>
  "error" in result ? respondError(result.error, 400) : respondJson(result);

// The public domain proxies to this Worker, so links must use it rather than
// whichever host the request arrived on. Local dev has no PUBLIC_URL override.
const resolvePublicOrigin = (request: Request, env: Env): string => {
  const requestOrigin = new URL(request.url).origin;
  const isLocalRequest = requestOrigin.startsWith("http://localhost");
  return env.PUBLIC_URL && !isLocalRequest ? env.PUBLIC_URL : requestOrigin;
};

const generateLogId = (): string => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(LOG_ID_BYTE_LENGTH));
  return btoa(String.fromCharCode(...randomBytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};

const parseOptionalInteger = (rawValue: string | null): number | undefined => {
  if (rawValue === null || rawValue === "") return undefined;
  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : Number.NaN;
};

const readJsonBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};

const parseAppendInputs = (payload: unknown): AppendRecordInput[] | string => {
  if (!isObjectRecord(payload)) return 'Body must be {"records": [...]}';
  const rawRecords = payload.records;
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return "records must be a non-empty array";
  }
  if (rawRecords.length > MAX_RECORDS_PER_APPEND) {
    return `At most ${MAX_RECORDS_PER_APPEND} records per append`;
  }
  return rawRecords.map((rawRecord: unknown) => ({
    headers:
      isObjectRecord(rawRecord) && isObjectRecord(rawRecord.headers) ? rawRecord.headers : {},
    body: isObjectRecord(rawRecord) ? (rawRecord.body ?? null) : null,
  }));
};

const handleLogRequest = async (
  request: Request,
  env: Env,
  logId: string,
  subPath: string,
): Promise<Response> => {
  const agentLog = env.AGENT_LOG.get(env.AGENT_LOG.idFromName(logId));
  if (!(await agentLog.exists())) return respondError("Log not found", 404);

  const requestUrl = new URL(request.url);
  const logUrl = `${resolvePublicOrigin(request, env)}/logs/${logId}`;

  if (subPath === "/" && request.method === "GET") {
    return new Response(renderGuide(logUrl, await agentLog.summarize()), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", ...CORS_HEADERS },
    });
  }

  if (subPath === "/summary" && request.method === "GET") {
    return respondJson(await agentLog.summarize());
  }

  if (subPath === "/tail" && request.method === "GET") {
    return respondJson({ tail: await agentLog.checkTail() });
  }

  if (subPath === "/records" && request.method === "GET") {
    const seqNum = parseOptionalInteger(requestUrl.searchParams.get("seq_num"));
    const tailOffset = parseOptionalInteger(requestUrl.searchParams.get("tail_offset"));
    const count = parseOptionalInteger(requestUrl.searchParams.get("count")) ?? DEFAULT_READ_COUNT;
    const waitSeconds = parseOptionalInteger(requestUrl.searchParams.get("wait")) ?? 0;
    if ([seqNum, tailOffset, count, waitSeconds].some((value) => Number.isNaN(value))) {
      return respondError(
        "seq_num, tail_offset, count, and wait must be non-negative integers",
        400,
      );
    }
    if (seqNum !== undefined && tailOffset !== undefined) {
      return respondError("Pass seq_num or tail_offset, not both", 400);
    }
    return respondJson(
      await agentLog.read({
        seqNum,
        tailOffset,
        count: Math.min(Math.max(count, 1), MAX_READ_COUNT),
        waitSeconds: Math.min(waitSeconds, MAX_READ_WAIT_SECONDS),
      }),
    );
  }

  if (subPath === "/records" && request.method === "POST") {
    const appendInputs = parseAppendInputs(await readJsonBody(request));
    if (typeof appendInputs === "string") return respondError(appendInputs, 400);
    return respondAppendResult(await agentLog.append(appendInputs));
  }

  if (subPath === "/next" && request.method === "POST") {
    const waitSeconds = parseOptionalInteger(requestUrl.searchParams.get("wait")) ?? 0;
    if (Number.isNaN(waitSeconds)) return respondError("wait must be a non-negative integer", 400);
    return respondJson(await agentLog.claimNext(Math.min(waitSeconds, MAX_READ_WAIT_SECONDS)));
  }

  if (subPath === "/items" && request.method === "GET") {
    const statusFilter = requestUrl.searchParams.get("status");
    if (statusFilter !== null && !isItemStatus(statusFilter)) {
      return respondError(`status must be one of: ${ITEM_STATUSES.join(", ")}`, 400);
    }
    return respondJson({
      items: await agentLog.listItems(statusFilter ?? undefined),
      tail: await agentLog.checkTail(),
      agent: await agentLog.getAgentPresence(),
    });
  }

  const itemStatusMatch = subPath.match(ITEM_STATUS_PATH_PATTERN);
  if (itemStatusMatch && request.method === "POST") {
    const payload = await readJsonBody(request);
    if (!isObjectRecord(payload)) {
      return respondError('Body must be {"status": "...", "note": "..."}', 400);
    }
    return respondAppendResult(
      await agentLog.append([
        {
          headers: { type: RECORD_TYPE_STATUS },
          body: { ref: Number(itemStatusMatch[1]), status: payload.status, note: payload.note },
        },
      ]),
    );
  }

  return respondError("Not found", 404);
};

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { pathname } = new URL(request.url);
    const origin = resolvePublicOrigin(request, env);

    if (pathname === "/logs" && request.method === "POST") {
      const logId = generateLogId();
      const agentLog = env.AGENT_LOG.get(env.AGENT_LOG.idFromName(logId));
      const createdAt = await agentLog.create();
      return respondJson({ id: logId, url: `${origin}/logs/${logId}`, created_at: createdAt }, 201);
    }

    const logPathMatch = pathname.match(LOG_PATH_PATTERN);
    if (logPathMatch) {
      const subPath = logPathMatch[2] && logPathMatch[2] !== "/" ? logPathMatch[2] : "/";
      return handleLogRequest(request, env, logPathMatch[1], subPath.replace(/\/$/, "") || "/");
    }

    return respondError("Not found", 404);
  },
} satisfies ExportedHandler<Env>;
