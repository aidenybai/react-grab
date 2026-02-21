"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BenchmarkResult, TestCase } from "@/components/benchmarks/types";
import { GithubButton } from "@/components/github-button";
import { ViewDocsButton } from "@/components/view-docs-button";
import { Collapsible } from "@/components/ui/collapsible";
import { BlogArticleLayout } from "@/components/blog-article-layout";
import resultsData from "@/public/results.json";
import testCasesData from "@/public/test-cases.json";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const BenchmarkCharts = dynamic(
  () =>
    import("@/components/benchmarks/benchmark-charts").then(
      (mod) => mod.BenchmarkCharts,
    ),
  { ssr: false },
);

const BenchmarkChartsTweetSkeleton = () => (
  <div className="border border-neutral-800 rounded-lg p-6 min-h-[197px]">
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-20 h-4 bg-neutral-800 rounded shrink-0" />
        <div className="flex-1 h-5 bg-neutral-800 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20 h-4 bg-neutral-800 rounded shrink-0" />
        <div className="flex-1 h-5 bg-neutral-800 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20 shrink-0" />
        <div className="flex-1 h-5" />
      </div>
    </div>
    <div className="flex items-center gap-3 mt-3">
      <div className="w-20 shrink-0" />
      <div className="flex-1 h-5" />
    </div>
    <div className="mt-3 h-4 w-3/4 bg-neutral-800 rounded" />
  </div>
);

const BenchmarkChartsTweet = dynamic(
  () =>
    import("@/components/benchmarks/benchmark-charts").then(
      (mod) => mod.BenchmarkChartsTweet,
    ),
  { ssr: false, loading: () => <BenchmarkChartsTweetSkeleton /> },
);

const BenchmarkDetailedTable = dynamic(
  () =>
    import("@/components/benchmarks/benchmark-detailed-table").then(
      (mod) => mod.BenchmarkDetailedTable,
    ),
  { ssr: false },
);

const StaticCodeBlock = ({ children }: { children: React.ReactNode }) => (
  <pre className="text-neutral-300 whitespace-pre font-mono text-xs leading-relaxed">
    {children}
  </pre>
);

const treatmentDurations = [
  4.755, 9.423, 4.082, 4.445, 7.015, 4.085, 12.276, 5.65, 7.932, 9.202, 3.54,
  8.796, 3.826, 3.61, 4.398, 3.825, 5.5, 4.092, 4.816, 4.091,
];

const controlDurations = [
  10.164, 13.411, 19.256, 10.539, 13.507, 12.787, 13.729, 22.528, 9.125, 77.383,
  11.419, 11.111, 15.488, 7.59, 13.575, 12.215, 12.325, 14.847, 15.216, 20.178,
];

const generateKernelDensity = (
  values: number[],
  bandwidth: number,
  min: number,
  max: number,
  steps: number,
) => {
  const result = [];
  const stepSize = (max - min) / steps;

  for (let i = 0; i <= steps; i++) {
    const currentX = min + i * stepSize;
    let density = 0;

    for (const value of values) {
      const normalizedDistance = (currentX - value) / bandwidth;
      density += Math.exp(-0.5 * normalizedDistance * normalizedDistance);
    }

    density = density / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    result.push({ x: currentX, density });
  }

  return result;
};

const generateDistributionData = () => {
  const minTime = 0;
  const maxTime = 30;
  const steps = 60;

  const treatmentDensity = generateKernelDensity(
    treatmentDurations,
    1.5,
    minTime,
    maxTime,
    steps,
  );
  const controlDensity = generateKernelDensity(
    controlDurations,
    3,
    minTime,
    maxTime,
    steps,
  );

  return treatmentDensity.map((point, index) => ({
    time: point.x.toFixed(1),
    reactGrab: point.density,
    traditional: controlDensity[index].density,
  }));
};

const treatmentAverage =
  treatmentDurations.reduce((sum, duration) => sum + duration, 0) /
  treatmentDurations.length;
const controlAverage =
  controlDurations.reduce((sum, duration) => sum + duration, 0) /
  controlDurations.length;
const speedupMultiplier = (controlAverage / treatmentAverage).toFixed(0);

const TimeComparisonChart = () => {
  const data = generateDistributionData();

  return (
    <div className="rounded-lg">
      <div className="flex flex-wrap items-center justify-end gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#525252]" />
          <span className="text-neutral-400">
            Without React Grab ~ {controlAverage.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-[#ff4fff]" />
          <span className="text-[#ff4fff]">
            With React Grab ~ {treatmentAverage.toFixed(1)}s
          </span>
        </div>
      </div>
      <div className="h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 30, left: 40 }}
          >
            <XAxis
              dataKey="time"
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
              tick={{ fill: "#666", fontSize: 10 }}
              label={{
                value: "Time per Edit (seconds)",
                position: "bottom",
                offset: 10,
                fill: "#666",
                fontSize: 11,
              }}
              ticks={["0.0", "5.0", "10.0", "15.0", "20.0", "25.0", "30.0"]}
            />
            <YAxis
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
              tick={{ fill: "#666", fontSize: 10 }}
              label={{
                value: "Density",
                angle: -90,
                position: "insideLeft",
                fill: "#666",
                fontSize: 11,
              }}
            />
            <ReferenceLine
              x={treatmentAverage.toFixed(1)}
              stroke="#ff4fff"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <ReferenceLine
              x={controlAverage.toFixed(1)}
              stroke="#525252"
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="traditional"
              stroke="#525252"
              fill="#525252"
              fillOpacity={0.4}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="reactGrab"
              stroke="#ff4fff"
              fill="#ff4fff"
              fillOpacity={0.4}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <span className="text-[#ff4fff] font-medium text-sm sm:text-base">
          {speedupMultiplier}× faster on average
        </span>
      </div>
    </div>
  );
};

TimeComparisonChart.displayName = "TimeComparisonChart";

const headings = [
  {
    id: "digging-through-react-internals",
    text: "Digging through React internals",
    level: 3,
  },
  { id: "benchmarking-for-speed", text: "Benchmarking for speed", level: 3 },
  { id: "how-it-impacts-you", text: "How it impacts you", level: 3 },
  { id: "whats-next", text: "What's next", level: 3 },
  { id: "try-it-out", text: "Try it out", level: 3 },
  { id: "footnotes", text: "Footnotes", level: 4 },
];

const authors = [{ name: "Aiden Bai", url: "https://x.com/aidenybai" }];

const BlogPostPage = () => {
  const testCaseMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    testCasesData.forEach((testCase: TestCase) => {
      mapping[testCase.name] = testCase.prompt;
    });
    return mapping;
  }, []);

  return (
    <BlogArticleLayout
      title="I made your coding agent 3× faster at frontend"
      authors={authors}
      date="November 24, 2025"
      headings={headings}
    >
      <Collapsible header={<span className="text-sm font-medium">TL;DR</span>}>
        <div className="pt-4">
          <BenchmarkChartsTweet results={resultsData as BenchmarkResult[]} />
        </div>
      </Collapsible>

      <div className="flex flex-col gap-4 text-neutral-400">
        <p>
          Coding agents suck at frontend because{" "}
          <span className="font-medium text-neutral-300">
            translating intent
          </span>{" "}
          (from UI → prompt → code → UI) is lossy.
        </p>

        <p>For example, if you want to make a UI change:</p>

        <ol className="list-decimal list-inside space-y-2 pl-2">
          <li>Create a visual representation in your brain</li>
          <li>Write a prompt (e.g. &quot;make this button bigger&quot;)</li>
        </ol>

        <p>How the coding agent processes this:</p>

        <ol className="list-decimal list-inside space-y-2 pl-2" start={3}>
          <li>
            Turns your prompt into a trajectory (e.g. &quot;let me grep/search
            for where this code might be&quot;)
          </li>
          <li>Tries to guess what you{"'"}re referencing and edits the code</li>
        </ol>

        <p>
          Search is a pretty random process since language models have
          non-deterministic outputs. Depending on the search strategy, these
          trajectories range from instant (if lucky) to very long.
          Unfortunately, this means added latency, cost, and performance.
        </p>

        <p>Today, there are two solutions to this problem:</p>

        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <span className="text-neutral-300 font-medium">Prompt better:</span>{" "}
            Use @ to add additional context, write longer and more specific
            prompts (this is something YOU control)
          </li>
          <li>
            <span className="text-neutral-300 font-medium">
              Make the agent better at codebase search
            </span>{" "}
            (this is something model/agent PROVIDERS control)
          </li>
        </ul>

        <p>
          Improving the agent is a <em>lot</em> of unsolved research problems.
          It involves training better models (see{" "}
          <a
            href="https://cursor.com/changelog/2-1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-white underline underline-offset-4"
          >
            Instant Grep
          </a>
          ,{" "}
          <a
            href="https://cognition.ai/blog/swe-grep"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-white underline underline-offset-4"
          >
            SWE-grep
          </a>
          ).
        </p>

        <p>
          Ultimately, reducing the amount of translation steps required makes
          the process faster and more accurate (this scales with codebase size).
        </p>

        <p>But what if there was a different way?</p>

        <div className="flex flex-col gap-3">
          <h3
            id="digging-through-react-internals"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            Digging through React internals
          </h3>
          <p>
            In my ad-hoc tests, I noticed that referencing the file path (e.g.{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              path/to/component.tsx
            </code>
            ) or something to{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              grep
            </code>{" "}
            (e.g.{" "}
            <code className="text-neutral-300 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-1 py-0.5 text-xs">
              className=&quot;flex flex-col gap-5 text-shimmer&quot;
            </code>
            ) made the coding agent{" "}
            <span className="text-neutral-300 font-medium">much</span> faster at
            finding what I was referencing. In short - there are shortcuts to
            reduce the number of steps needed to search!
          </p>
          <p>
            Turns out, React.js exposes the source location for elements on the
            page.
            <sup className="text-neutral-500 text-[10px] ml-0.5">1</sup> React
            Grab walks up the component tree from the element you clicked,
            collects each component&apos;s component name and source location
            (file path + line number), and formats that into a readable stack.
          </p>
          <p>It looks something like this:</p>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="px-3 py-2">
              <div className="font-mono text-xs overflow-x-auto">
                <StaticCodeBlock>
                  <span className="text-neutral-500">&lt;</span>
                  <span className="text-[#4ec9b0]">span</span>
                  <span className="text-neutral-500">&gt;</span>
                  <span className="text-[#ce9178]">React Grab</span>
                  <span className="text-neutral-500">&lt;/</span>
                  <span className="text-[#4ec9b0]">span</span>
                  <span className="text-neutral-500">&gt;</span>
                  {"\n"}
                  <span className="text-neutral-500">in </span>
                  <span className="text-[#dcdcaa]">StreamDemo</span>
                  <span className="text-neutral-500"> at </span>
                  <span className="text-[#9cdcfe]">
                    components/stream-demo.tsx:42:11
                  </span>
                </StaticCodeBlock>
              </div>
            </div>
          </div>
          <p>
            When I passed this to Cursor, it <em>instantly</em> found the file
            and made the change in a couple seconds. Trying on a couple other
            cases got the same result.
          </p>
          <div className="py-12">
            <video
              src="/demo.webm"
              autoPlay
              loop
              muted
              playsInline
              className="w-full rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3
            id="benchmarking-for-speed"
            className="text-lg font-medium text-neutral-200 mt-4 scroll-mt-24"
          >
            Benchmarking for speed
          </h3>
          <p>
            I used the{" "}
            <a
              href="https://github.com/shadcn-ui/ui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              shadcn/ui dashboard
            </a>{" "}
            as the test codebase. This is a Next.js application with auth, data
            tables, charts, and form components.
          </p>
          <p>
            The benchmark consists of{" "}
            <a
              href="https://github.com/aidenybai/react-grab/blob/main/packages/benchmarks/test-cases.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              20 test cases
            </a>{" "}
            designed to cover a wide range of UI element retrieval scenarios.
            Each test represents a real-world task that developers commonly
            perform when working with coding agents.
          </p>
          <p>
            Each test ran twice: once with React Grab enabled (treatment), once
            without (control). Both conditions used identical codebases and
            Claude 4.5 Sonnet (in Claude Code).
            <sup className="text-neutral-500 text-[10px] ml-0.5">2</sup>
          </p>
        </div>
      </div>

      <div className="-mx-4 sm:-mx-8 lg:mx-0 px-4 sm:px-8 lg:px-0 py-16">
        <div className="max-w-4xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium text-neutral-400">
                Without React Grab:
              </div>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-neutral-300">
                &quot;Find the forgot password link in the login form&quot;
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="text-sm text-[#818181]">
                  Read{" "}
                  <span className="text-[#5b5b5b]">
                    components/login-form.tsx
                  </span>
                </div>
                <div className="text-sm text-[#818181]">
                  Grepped{" "}
                  <span className="text-[#5b5b5b]">forgot password</span>
                </div>
                <div className="text-sm text-[#818181]">
                  Read{" "}
                  <span className="text-[#5b5b5b]">
                    components/auth/forgot.tsx
                  </span>
                </div>
                <div className="text-sm text-[#818181]">
                  Read{" "}
                  <span className="text-[#5b5b5b]">
                    components/ui/field.tsx
                  </span>
                </div>
                <div className="text-sm text-[#818181]">
                  Grepped{" "}
                  <span className="text-[#5b5b5b]">ml-auto.*password</span>
                </div>
              </div>
              <div className="text-xs text-neutral-600 font-mono">
                ~13.6s, 5 tool calls, 41.8K tokens
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium text-neutral-300">
                With React Grab:
              </div>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 flex flex-col gap-2">
                  <div className="text-sm text-neutral-300">
                    &quot;Find the forgot password link in the login form&quot;
                  </div>
                  <div className="font-mono text-xs overflow-x-auto">
                    <StaticCodeBlock>
                      <span className="text-neutral-500">&lt;</span>
                      <span className="text-[#4ec9b0]">a</span>
                      <span className="text-[#9cdcfe]"> class</span>
                      <span className="text-neutral-500">=</span>
                      <span className="text-[#ce9178]">
                        &quot;ml-auto inline-block text-...&quot;
                      </span>
                      <span className="text-[#9cdcfe]"> href</span>
                      <span className="text-neutral-500">=</span>
                      <span className="text-[#ce9178]">&quot;#&quot;</span>
                      <span className="text-neutral-500">&gt;</span>
                      {"\n  "}
                      <span className="text-[#ce9178]">
                        Forgot your password?
                      </span>
                      {"\n"}
                      <span className="text-neutral-500">&lt;/</span>
                      <span className="text-[#4ec9b0]">a</span>
                      <span className="text-neutral-500">&gt;</span>
                      {"\n"}
                      <span className="text-neutral-500">in </span>
                      <span className="text-[#dcdcaa]">LoginForm</span>
                      <span className="text-neutral-500"> at </span>
                      <span className="text-[#9cdcfe]">
                        components/login-form.tsx:46:19
                      </span>
                    </StaticCodeBlock>
                  </div>
                </div>
              </div>
              <div className="text-sm text-[#818181]">
                Read{" "}
                <span className="text-[#5b5b5b]">
                  components/login-form.tsx
                </span>
              </div>
              <div className="text-xs text-neutral-600 font-mono">
                ~6.9s, 1 tool call, 28.1K tokens
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 text-neutral-400">
        <p>
          Without React Grab, the agent must search through the codebase to find
          the right component. Since language models predict tokens
          non-deterministically, this search process varies dramatically -
          sometimes finding the target instantly, other times requiring multiple
          attempts. This unpredictability adds latency, increases token
          consumption, and degrades overall performance.
        </p>

        <p>
          With React Grab, the search phase is eliminated entirely. The
          component stack with exact file paths and line numbers is embedded
          directly in the DOM. The agent can jump straight to the correct file
          and locate what it needs in O(1) time complexity.
        </p>

        <p>
          …and turns out, Claude Code becomes ~
          <span className="font-medium text-neutral-300">
            3× faster with React Grab
          </span>
          !<sup className="text-neutral-500 text-[10px] ml-0.5">3</sup>
        </p>
        <div className="py-4">
          <TimeComparisonChart />
        </div>
        <p className="text-sm text-neutral-500">
          Distribution of edit times across 20 UI tasks. React Grab eliminates
          the search phase by providing exact file paths and line numbers,
          letting the agent jump straight to the code.
        </p>
      </div>

      <div className="-mx-4 sm:-mx-8 lg:mx-0 px-4 sm:px-8 lg:px-0 py-12">
        <BenchmarkCharts results={resultsData as BenchmarkResult[]} />
      </div>

      <div className="flex flex-col gap-6 text-neutral-400 mb-16">
        <p>
          Below are the latest measurement results from all 20 test cases. The
          table below shows a detailed breakdown comparing performance metrics
          (time, tool calls, tokens) between the control and treatment groups,
          with speedup percentages indicating how much faster React Grab made
          the agent for each task.
        </p>
      </div>

      <div className="w-screen relative left-1/2 -translate-x-1/2 px-4 sm:px-8">
        <BenchmarkDetailedTable
          results={resultsData as BenchmarkResult[]}
          testCaseMap={testCaseMapping}
          lastRunDate="November 20, 2025 at 12:17 PM"
        />
      </div>

      <div className="pt-8">
        <div className="text-sm text-neutral-500 pt-6">
          <p>
            To run the benchmark yourself, check out the{" "}
            <a
              href="https://github.com/aidenybai/react-grab/tree/main/packages/benchmarks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              benchmarks directory
            </a>{" "}
            on GitHub.
          </p>
        </div>
      </div>

      <div className="pt-16 flex flex-col gap-6 text-neutral-400">
        <div className="flex flex-col gap-4">
          <h3
            id="how-it-impacts-you"
            className="text-lg font-medium text-neutral-200 scroll-mt-24"
          >
            How it impacts you
          </h3>
          <p>
            The best use case I&apos;ve seen for React Grab is for low-entropy
            adjustments like: spacing, layout tweaks, or minor visual changes.
          </p>
          <p>
            If you iterate on UI frequently, this can make everyday changes feel
            smoother. Instead of describing where the code is, you can select an
            element and give the agent an exact starting point.
          </p>
          <p>
            React Grab works with{" "}
            <span className="font-medium text-neutral-300">any</span> IDE or
            coding tool: Cursor, Claude Code, Copilot, Codex, Zed, Windsurf, you
            name it. At its core, it just adds extra context to your prompt that
            helps the agent locate the right code faster.
          </p>
          <p>
            We&apos;re finally moves things a bit closer to narrowing the intent
            to output gap (see{" "}
            <a
              href="https://youtu.be/PUv66718DII?t=390"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              Inventing on Principle
            </a>
            ).
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          <h3
            id="whats-next"
            className="text-lg font-medium text-neutral-200 scroll-mt-24"
          >
            What&apos;s next
          </h3>
          <p>
            There are a lot of improvements that can be made to this benchmark:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              Different codebases (this benchmark used shadcn dashboard) - what
              happens with different frameworks/sizes/patterns? Need to run it
              on more repos.
            </li>
            <li>Different agents/model providers</li>
            <li>
              Multiple trials and sampling - decrease variance, since agents are
              non-deterministic
            </li>
          </ul>
          <p>
            On the React Grab side - there&apos;s also a bunch of stuff that
            could make this even better. For example, grabbing error stack
            traces when things break, or building a Chrome extension so you
            don&apos;t need to modify your app at all. Maybe add screenshots of
            the element you&apos;re grabbing, or capture runtime state/props.
          </p>
          <p>
            If you want to help out or have ideas, hit me up on{" "}
            <a
              href="https://x.com/aidenybai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-300 hover:text-white underline underline-offset-4"
            >
              Twitter
            </a>{" "}
            or open an issue on GitHub.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3
            id="try-it-out"
            className="text-lg font-medium text-neutral-200 scroll-mt-24"
          >
            Try it out
          </h3>
          <p>
            React Grab is free and open source.{" "}
            <Link
              href="/"
              className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
            >
              Go try it out!
            </Link>
          </p>
          <div className="flex gap-2">
            <GithubButton />
            <ViewDocsButton />
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-12 pt-8 border-t border-neutral-800">
          <h4
            id="footnotes"
            className="text-sm font-medium text-neutral-400 scroll-mt-24"
          >
            Footnotes
          </h4>
          <div className="flex flex-col gap-4 text-sm text-neutral-500">
            <p>
              <sup className="text-neutral-600 mr-1">1</sup>
              This only works in development mode. React strips source locations
              in production builds for performance and bundle size. React Grab
              detects this and falls back to just showing the component names
              without file paths. The component tree is still useful for
              understanding structure, but you lose the direct file references.
              This only works in production if you have source maps enabled.
            </p>
            <p>
              <sup className="text-neutral-600 mr-1">2</sup>
              Single trial per test case is a limitation. Agents are
              non-deterministic, so results can vary significantly between runs.
              Ideally we&apos;d run each test 5-10 times and report confidence
              intervals. The 3× speedup is directionally correct but treat the
              exact number with appropriate skepticism. Future benchmarks will
              include multiple trials. I&apos;m very open to fixing issues with
              the benchmarks. If you spot anything off, please{" "}
              <a
                href="mailto:aiden@million.dev"
                className="text-neutral-400 hover:text-white underline underline-offset-4"
              >
                email me
              </a>{" "}
              or{" "}
              <a
                href="https://x.com/aidenybai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white underline underline-offset-4"
              >
                DM me on Twitter
              </a>
              .
            </p>
            <p>
              <sup className="text-neutral-600 mr-1">3</sup>
              This is median speedup across all 20 test cases. Some tasks showed
              80%+ improvement (simple element lookups), others showed minimal
              gains (complex multi-file changes where search wasn&apos;t the
              bottleneck). The variance is high. Your mileage will vary
              depending on codebase size, component nesting depth, and how
              descriptive your component names are.
            </p>
          </div>
        </div>
      </div>
    </BlogArticleLayout>
  );
};

BlogPostPage.displayName = "BenchmarksPage";

export default BlogPostPage;
