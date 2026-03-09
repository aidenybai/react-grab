"use client";

import { useEffect, useState } from "react";

interface ResolverResult {
  filePath: string | null;
  componentName: string | null;
  found: boolean;
  ms: number;
  correct: boolean;
}

interface EntryResult {
  id: number;
  testId: string;
  difficulty: string;
  expected: string;
  resolvers: Record<string, ResolverResult>;
}

interface BenchData {
  resolverNames: string[];
  results: EntryResult[];
}

const TIERS = ["easy", "medium", "hard", "nightmare"] as const;
const TIER_COLORS: Record<string, string> = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#f97316",
  nightmare: "#ef4444",
};
const RESOLVER_COLORS: Record<string, string> = {
  "claude-code": "#34d399",
  "agentation+claude": "#fbbf24",
  "react-grab+claude": "#fb923c",
};
const CLI_RESOLVERS = ["claude-code", "agentation+claude", "react-grab+claude"];

const formatDuration = (ms: number) =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms.toFixed(0)}ms`;

const normalizeFilePath = (filePath: string) =>
  filePath.match(/components\/.*|app\/.*|lib\/.*/)?.[0] ?? filePath;

const BenchmarksPage = () => {
  const [data, setData] = useState<BenchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bench-results")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(() =>
        setError("No benchmark results found. Run the bench first."),
      );
  }, []);

  if (error) return <div style={styles.empty}>{error}</div>;
  if (!data) return <div style={styles.empty}>Loading...</div>;

  const resolvers = data.resolverNames.filter((resolverName) =>
    CLI_RESOLVERS.includes(resolverName),
  );
  if (resolvers.length === 0)
    return <div style={styles.empty}>No CLI resolver results found.</div>;

  const getStats = (name: string) => {
    const allResolverResults = data.results
      .map((entry) => entry.resolvers[name])
      .filter(Boolean);
    const correctResults = allResolverResults.filter(
      (resolverResult) => resolverResult.correct,
    );
    const avgMs = correctResults.length
      ? correctResults.reduce(
          (sum, resolverResult) => sum + resolverResult.ms,
          0,
        ) / correctResults.length
      : null;
    return {
      correct: correctResults.length,
      total: data.results.length,
      avgMs,
    };
  };

  const sorted = resolvers
    .map((name) => ({ name, ...getStats(name) }))
    .sort((a, b) => b.correct / b.total - a.correct / a.total);

  const maxPct = Math.max(...sorted.map((stat) => stat.correct / stat.total));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Source Resolution Benchmark</h1>
        <p style={styles.subtitle}>
          {data.results.length} test cases &middot; {TIERS.length} difficulty
          tiers &middot; {resolvers.length} resolvers
        </p>
      </div>

      {/* Horizontal bars */}
      <div style={styles.barsSection}>
        {sorted.map((resolverStat) => {
          const pct = resolverStat.correct / resolverStat.total;
          const width = maxPct === 0 ? "0%" : `${(pct / maxPct) * 100}%`;
          const color = RESOLVER_COLORS[resolverStat.name] ?? "#888";
          return (
            <div key={resolverStat.name} style={styles.barRow}>
              <div style={{ ...styles.barLabel, color }}>
                {resolverStat.name}
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width,
                    background: `linear-gradient(90deg, ${color}ee, ${color}88)`,
                  }}
                >
                  <span style={styles.barDetail}>
                    {resolverStat.correct}/{resolverStat.total}
                    {resolverStat.avgMs !== null
                      ? ` · ${formatDuration(resolverStat.avgMs)}`
                      : ""}
                  </span>
                </div>
                <span style={styles.barPct}>{(pct * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tier heatmap */}
      <div style={styles.heatSection}>
        <div style={styles.heatGrid}>
          <div style={styles.heatCorner} />
          {TIERS.map((tier) => {
            const count = data.results.filter(
              (entry) => entry.difficulty === tier,
            ).length;
            return (
              <div
                key={tier}
                style={{ ...styles.heatHeader, color: TIER_COLORS[tier] }}
              >
                {tier.toUpperCase()} ({count})
              </div>
            );
          })}
          {sorted.map((resolverStat) => {
            const color = RESOLVER_COLORS[resolverStat.name] ?? "#888";
            return [
              <div
                key={`${resolverStat.name}-label`}
                style={{ ...styles.heatLabel, color }}
              >
                {resolverStat.name}
              </div>,
              ...TIERS.map((tier) => {
                const tierEntries = data.results.filter(
                  (entry) => entry.difficulty === tier,
                );
                const correct = tierEntries.filter(
                  (entry) => entry.resolvers[resolverStat.name]?.correct,
                ).length;
                const count = tierEntries.length;
                const pct = count ? correct / count : 0;
                const opacity = 0.15 + pct * 0.7;
                return (
                  <div
                    key={`${resolverStat.name}-${tier}`}
                    style={{
                      ...styles.heatCell,
                      backgroundColor: `${color}${Math.round(opacity * 255)
                        .toString(16)
                        .padStart(2, "0")}`,
                    }}
                  >
                    <span style={styles.heatPct}>
                      {count ? `${(pct * 100).toFixed(0)}%` : "—"}
                    </span>
                    <span style={styles.heatCount}>
                      {count ? `${correct}/${count}` : ""}
                    </span>
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>

      {/* Per-case detail */}
      <div style={styles.detailSection}>
        {TIERS.map((tier) => {
          const tierEntries = data.results.filter(
            (entry) => entry.difficulty === tier,
          );
          if (tierEntries.length === 0) return null;
          return (
            <div key={tier}>
              <div
                style={{
                  ...styles.tierHeader,
                  color: TIER_COLORS[tier],
                  borderColor: `${TIER_COLORS[tier]}33`,
                }}
              >
                {tier.toUpperCase()} ({tierEntries.length} cases)
              </div>
              {tierEntries.map((entry, entryIndex) => {
                const allCorrect = resolvers.every(
                  (resolverName) => entry.resolvers[resolverName]?.correct,
                );
                const allWrong = resolvers.every(
                  (resolverName) => !entry.resolvers[resolverName]?.correct,
                );
                return (
                  <div
                    key={entry.id}
                    style={{
                      ...styles.entryRow,
                      backgroundColor:
                        entryIndex % 2 === 0 ? "#161b22" : "transparent",
                    }}
                  >
                    <div style={styles.entryHeader}>
                      <span>
                        <span
                          style={{
                            ...styles.dot,
                            backgroundColor: TIER_COLORS[entry.difficulty],
                          }}
                        />
                        <span
                          style={{
                            ...styles.entryName,
                            color: allCorrect
                              ? "#3fb950"
                              : allWrong
                                ? "#f85149"
                                : "#c9d1d9",
                          }}
                        >
                          #{entry.id} {entry.testId}
                        </span>
                      </span>
                      <span style={styles.entryExpected}>{entry.expected}</span>
                    </div>
                    {resolvers.map((name) => {
                      const resolverResult = entry.resolvers[name];
                      const color = RESOLVER_COLORS[name] ?? "#8b949e";
                      if (!resolverResult?.found && !resolverResult?.filePath) {
                        return (
                          <div key={name} style={styles.resolverRow}>
                            <span style={{ color: "#484f58" }}>✗ {name}</span>
                            <span style={{ color: "#484f58" }}>
                              (no result)
                            </span>
                          </div>
                        );
                      }
                      const path = resolverResult.filePath
                        ? normalizeFilePath(resolverResult.filePath)
                        : "(null)";
                      return (
                        <div key={name} style={styles.resolverRow}>
                          <span>
                            <span
                              style={{
                                color: resolverResult.correct
                                  ? "#3fb950"
                                  : "#f85149",
                                fontWeight: 600,
                                marginRight: 6,
                              }}
                            >
                              {resolverResult.correct ? "✓" : "✗"}
                            </span>
                            <span style={{ color, fontWeight: 500 }}>
                              {name}
                            </span>
                          </span>
                          <span style={styles.resolverDetail}>
                            <span
                              style={{
                                color: resolverResult.correct
                                  ? "#8b949e"
                                  : "#484f58",
                              }}
                            >
                              {path}
                            </span>
                            {!resolverResult.correct &&
                              resolverResult.found && (
                                <span style={styles.wrongBadge}>WRONG</span>
                              )}
                            <span style={{ color: "#484f58", fontSize: 11 }}>
                              {formatDuration(resolverResult.ms)}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 24px",
    fontFamily:
      "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#c9d1d9",
    background: "#0d1117",
    minHeight: "100vh",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    color: "#8b949e",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    background: "#0d1117",
  },
  header: { marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 },
  subtitle: { fontSize: 13, color: "#8b949e", marginTop: 6 },
  barsSection: { display: "flex", flexDirection: "column", gap: 12 },
  barRow: { display: "flex", alignItems: "center", gap: 12 },
  barLabel: {
    width: 180,
    textAlign: "right",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    background: "#161b22",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  barFill: {
    height: "100%",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    paddingLeft: 10,
    transition: "width 0.5s ease",
  },
  barDetail: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    whiteSpace: "nowrap",
  },
  barPct: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    marginLeft: 8,
    whiteSpace: "nowrap",
  },
  heatSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #21262d",
  },
  heatGrid: {
    display: "grid",
    gridTemplateColumns: "180px repeat(4, 1fr)",
    gap: 4,
  },
  heatCorner: {},
  heatHeader: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: 600,
    padding: "6px 0",
  },
  heatLabel: {
    textAlign: "right",
    fontSize: 12,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 12,
  },
  heatCell: {
    borderRadius: 8,
    padding: "6px 0",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  heatPct: { fontSize: 14, fontWeight: 700, color: "#fff" },
  heatCount: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  detailSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid #21262d",
  },
  tierHeader: {
    fontSize: 12,
    fontWeight: 700,
    padding: "12px 0 8px",
    borderBottom: "1px solid",
    marginBottom: 4,
    marginTop: 16,
  },
  entryRow: { padding: "8px 12px", borderRadius: 6 },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    marginRight: 8,
    verticalAlign: "middle",
  },
  entryName: { fontSize: 12, fontWeight: 600 },
  entryExpected: { fontSize: 11, color: "#484f58" },
  resolverRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    padding: "2px 0 2px 20px",
  },
  resolverDetail: { display: "flex", alignItems: "center", gap: 8 },
  wrongBadge: {
    fontSize: 9,
    fontWeight: 600,
    color: "#f85149",
    padding: "1px 4px",
    border: "1px solid #f8514933",
    borderRadius: 3,
  },
};

export default BenchmarksPage;
