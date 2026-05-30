// HACK: this is a one-shot CLI, but when stdin (fd 0) is an inherited pipe or
// socket Node keeps the event loop alive for as long as that handle is open —
// even though the only thing that ever reads stdin is an interactive prompt.
// When the CLI is spawned by a parent that holds the stdin write-end open (eval
// runners, CI harnesses, editor integrations), the command finishes yet the
// process never exits: the inherited `Socket fd=0` refs the loop. Unref-ing fd
// 0 makes an idle pipe/socket incapable of holding the process open.
//
// We MUST NOT unref an interactive TTY. A real terminal is the only case that
// shows prompts, and `prompts` never re-refs an unref'd stdin handle: its base
// element does `readline.createInterface(...)` + `setRawMode(true)` but never
// `resume()`, none of which re-ref the libuv handle. Unref-ing a TTY would let
// the event loop drain while a prompt is still waiting for input — the CLI
// would render the prompt and then exit by itself before the user can answer.
// Guarding on `isTTY` keeps the one-shot exit fix without breaking prompts.
export const unrefStdin = (): void => {
  if (process.stdin.isTTY) return;
  process.stdin.unref?.();
};
