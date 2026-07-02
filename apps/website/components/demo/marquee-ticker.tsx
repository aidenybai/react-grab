const TICKER_PHRASES = [
  "Copy any UI element",
  "Point your agent at the source",
  "2× faster retrieval",
  "Works in Claude Code, Codex, and Cursor",
];

const TickerRun = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
  <div aria-hidden={ariaHidden} className="flex shrink-0 items-center">
    {TICKER_PHRASES.map((phrase) => (
      <span key={phrase} className="flex items-center">
        <span className="px-4 font-mono text-xs uppercase tracking-widest text-meta">{phrase}</span>
        <span className="text-brand">✦</span>
      </span>
    ))}
  </div>
);

TickerRun.displayName = "TickerRun";

export const MarqueeTicker = () => (
  <div className="overflow-hidden rounded-lg border border-line py-2.5">
    <div className="flex w-max animate-marquee">
      <TickerRun />
      <TickerRun ariaHidden />
    </div>
  </div>
);

MarqueeTicker.displayName = "MarqueeTicker";
