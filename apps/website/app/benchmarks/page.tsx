import { createPageMetadata } from "@/lib/metadata";
import { AccentLink } from "@/components/prose";
import { PageHeader } from "@/components/page-header";
import { BenchmarkLeaderboard } from "@/components/benchmark/leaderboard";
import { TOTAL_CASES, LAST_BENCHMARKED } from "@/components/benchmark/data";

export const metadata = createPageMetadata({
  title: "Benchmarks",
  description: "How React Grab helps coding agents find the right source file, faster.",
  path: "/benchmarks",
});

const BenchmarksPage = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-8 text-prose sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col pt-8">
        <PageHeader
          title="Benchmarks"
          subtitle={`Coding agents finding the right source file across ${TOTAL_CASES} retrieval tasks in production-scale codebases.`}
        />

        <p className="mt-6 leading-relaxed">
          Each resolver is Claude Code plus one browser-side tool, given a natural-language
          description of a UI element and asked to name the file that defines it. React Grab ties
          for the best accuracy at <span className="text-title">96%</span> and is the fastest at{" "}
          <span className="text-title">20.7s</span>. The next accurate tool takes 30.7s.
        </p>

        <div className="mt-6">
          <BenchmarkLeaderboard />
        </div>

        <p className="mt-6 text-sm text-prose">
          {TOTAL_CASES} test cases · Last benchmarked {LAST_BENCHMARKED} ·{" "}
          <AccentLink href="https://benchmark.react-grab.com">Full breakdown</AccentLink> ·{" "}
          <AccentLink href="https://github.com/aidenybai/react-bench">
            Source &amp; methodology
          </AccentLink>
        </p>
      </div>
    </div>
  );
};

BenchmarksPage.displayName = "BenchmarksPage";

export default BenchmarksPage;
