export const buildAgentLogPrompt = (
  logUrl: string,
): string => `I'm leaving comments on my web app with React Grab. Each comment becomes a todo in this log, and I'm watching them get done live:
${logUrl}

Read the guide first: curl -s "${logUrl}"

Then run this loop, and keep it running until I tell you to stop. Don't end your turn or ask me anything while waiting:
1. Claim the next todo (waits up to 55s for one to arrive): curl -s -X POST "${logUrl}/next?wait=55"
   If "item" is null, run it again right away.
2. Make the change in this codebase. item.comment.content has my comment plus the element's HTML and source file:line.
3. Report it: curl -s -X POST "${logUrl}/items/<seq_num>/status" -H "Content-Type: application/json" -d '{"status":"done","note":"what you changed"}'
   Use "error" with the reason if you can't finish, or "canceled" if no change is needed.
4. Go back to step 1.`;
