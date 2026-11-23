# @react-grab/agent-log

A Cloudflare Worker that backs the React Grab toolbar's **Connect agent** flow. When an agent is connected, comments become todos instead of clipboard copies. The agent loops on `POST /next`, and the toolbar's tray shows each todo move from todo to in progress to done. Each link points to its own Durable Object, which holds an append-only log of records. Comments left with React Grab are appended to the log. An agent reads them and triages each one by appending status records.

## Run locally

```bash
pnpm --filter @react-grab/agent-log dev   # http://localhost:8787
```

Point React Grab at it:

```js
window.__REACT_GRAB__.setOptions({ agentLogServerUrl: "http://localhost:8787" });
```

Or pass `data-options='{"agentLogServerUrl":"http://localhost:8787"}'` on the script tag.

## Production

`https://agent.react-grab.com` is served by a small Vercel project (`proxy/`, team `millionjs`, project `react-grab-agent-log`). It rewrites every request to the Worker at `react-grab-agent-log.aidenbai.workers.dev`. The domain goes through Vercel because `react-grab.com` DNS lives on Vercel. `PUBLIC_URL` makes the Worker return `agent.react-grab.com` links.

```bash
pnpm --filter @react-grab/agent-log deploy        # Worker
cd apps/agent-log/proxy && vercel deploy --prod --scope millionjs   # proxy
```

## API

| Method | Path                                                    | Purpose                                                                                   |
| ------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| POST   | `/logs`                                                 | Create a log. Returns `{ id, url }`.                                                      |
| GET    | `/logs/:id`                                             | Markdown guide for agents, with live counts.                                              |
| POST   | `/logs/:id/next?wait=0..60`                             | Claim the oldest todo as `in_progress`, waiting for one to arrive. The agent's main loop. |
| POST   | `/logs/:id/records`                                     | Append `{ records: [{ headers, body }] }` atomically. Returns `{ start, end, tail }`.     |
| GET    | `/logs/:id/records?seq_num=N\|tail_offset=N&count&wait` | Read from a position. `wait` (≤ 60 s) long-polls at the tail.                             |
| GET    | `/logs/:id/tail`                                        | Next `seq_num` and the last record's timestamp.                                           |
| GET    | `/logs/:id/items[?status=]`                             | Comments folded with their current status, note, and history.                             |
| POST   | `/logs/:id/items/:seq_num/status`                       | Append a status record: `{ status, note? }`.                                              |
| GET    | `/logs/:id/summary`                                     | Item counts by status.                                                                    |

Record types (`headers.type`): `comment`, `status`. Statuses: `todo`, `in_progress`, `done`, `error`, `canceled`.

The log ID is an unguessable 128-bit capability. Anyone with the link can read and append. There is no other auth yet.
