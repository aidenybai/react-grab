import { ITEM_STATUSES, MAX_READ_WAIT_SECONDS } from "./constants.js";
import type { LogSummary } from "./types.js";

export const renderGuide = (logUrl: string, summary: LogSummary): string => {
  const countsLine = ITEM_STATUSES.map((status) => `${status}: ${summary.counts[status]}`).join(
    " · ",
  );

  return `# React Grab agent log

A person is leaving comments on their web app with React Grab. Each comment is a
todo in this log. Your job is to work through them as they arrive, live, while
the person watches each one move from todo to in progress to done.

Log: ${logUrl}
Items: ${countsLine}
Agent: ${summary.agent.state}

## The loop

Run this loop and keep running it until the person tells you to stop. Do not
end your turn, summarize, or ask questions while waiting for comments.

1. Claim the next comment. This waits up to ${MAX_READ_WAIT_SECONDS} seconds for one to arrive,
   marks it in_progress, and returns it:
     curl -s -X POST "${logUrl}/next?wait=55"
   If "item" is null, nothing arrived. Run the same command again right away.
2. Do the work in the codebase. item.comment.comment is the request.
   item.comment.content adds the grabbed element's HTML and source file:line.
   item.comment.elements lists component names and source locations.
3. Report the result with a short note:
     curl -s -X POST "${logUrl}/items/<seq_num>/status" -H "Content-Type: application/json" \\
       -d '{"status":"done","note":"Bolded the label in src/components/todo-item.tsx"}'
   Use "error" with the reason when you can't finish, or "canceled" when no change is needed.
4. Go back to step 1.

Claiming is atomic, so several agents can share one log without doing the same comment twice.
While you wait in step 1, the person's toolbar shows that an agent is listening.

## API

All bodies are JSON. CORS is open.

- POST ${logUrl}/next?wait=0..${MAX_READ_WAIT_SECONDS}
  Claims the oldest todo as in_progress: {"item": {...} | null, "tail": {...}}.
- POST ${logUrl}/items/<seq_num>/status   {"status": "...", "note": "..."}
  Statuses: ${ITEM_STATUSES.join(", ")}.
- GET  ${logUrl}/items[?status=todo]
  Every comment with its status, note, and history, plus the agent's presence.
- GET  ${logUrl}/records?seq_num=N | tail_offset=N [&count=100] [&wait=0..${MAX_READ_WAIT_SECONDS}]
  Raw records from a position. With wait, the request holds until a record arrives.
- POST ${logUrl}/records   {"records":[{"headers":{"type":"comment"},"body":{...}}]}
  Appends records atomically. Returns {"start","end","tail"}.
- GET  ${logUrl}/tail
  The next seq_num.
`;
};
