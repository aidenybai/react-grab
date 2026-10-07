// Never resolves, holding its connection open until the client aborts. The
// blocking-request e2e fires several of these to saturate the per-origin
// connection pool, so react-grab's symbolication POST has to queue behind them.
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return new Promise<Response>(() => {});
}
