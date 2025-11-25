"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { highlightCode } from "@/lib/shiki";
import {
  BenchmarkCharts,
  BenchmarkChartsTweet,
} from "@/components/benchmarks/benchmark-charts";
import { BenchmarkDetailedTable } from "@/components/benchmarks/benchmark-detailed-table";
import { BenchmarkResult, TestCase } from "@/components/benchmarks/types";
import { GithubButton } from "@/components/github-button";
import { CursorInstallButton } from "@/components/cursor-install-button";
import { Collapsible } from "@/components/collapsible";
import resultsData from "@/public/results.json";
import testCasesData from "@/public/test-cases.json";
import demoGif from "@/public/demo.gif";

const BlogPostPage = () => {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [highlightedReactInternalsCode, setHighlightedReactInternalsCode] =
    useState<string>("");

  const testCaseMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    testCasesData.forEach((testCase: TestCase) => {
      mapping[testCase.name] = testCase.prompt;
    });
    return mapping;
  }, []);

  const codeExample = `<selected_element>

<a class="ml-auto inline-block text-..." href="#">
  Forgot your password?
</a>

  at a in components/login-form.tsx:46:19
  at div in components/login-form.tsx:44:17
  at Field in components/ui/field.tsx:87:5
  at FieldGroup in components/ui/field.tsx:46:5
  at form in components/login-form.tsx:32:11

</selected_element>`;

  const reactInternalsCodeExample = `<selected_element>

## HTML Frame:

<span class="font-bold">
  React Grab
</span>

## Code Location:

  at motion.div
  at StreamingText in /[project]/packages/website/components/blocks/streaming-text.tsx
  at MessageBlock in /[project]/packages/website/components/blocks/message-block.tsx
  at StreamDemo in /[project]/packages/website/components/stream-demo.tsx

</selected_element>`;

  useEffect(() => {
    const highlight = async () => {
      const html = await highlightCode({
        code: codeExample,
        lang: "html",
        showLineNumbers: false,
      });
      setHighlightedCode(html);
    };
    highlight();
  }, [codeExample]);

  useEffect(() => {
    const highlight = async () => {
      const html = await highlightCode({
        code: reactInternalsCodeExample,
        lang: "html",
        showLineNumbers: false,
      });
      setHighlightedReactInternalsCode(html);
    };
    highlight();
  }, [reactInternalsCodeExample]);

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <div className="px-4 sm:px-8 pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Image
                  src={ReactGrabLogo}
                  alt="React Grab"
                  className="w-10 h-10"
                />
              </Link>
              <h1 className="text-xl font-medium text-white">
                I made your coding agent 55% faster at frontend
              </h1>
            </div>

            <div className="text-sm text-neutral-500">
              By{" "}
              <a
                href="https://x.com/aidenybai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white underline underline-offset-4"
              >
                Aiden Bai
              </a>
              {" · "}
              <span>November 24, 2025</span>
            </div>
          </div>

          <Collapsible
            header={
              <span className="text-sm font-medium">
                TL;DR
              </span>
            }
          >
            <div className="pt-4">
              <BenchmarkChartsTweet
                results={resultsData as BenchmarkResult[]}
              />
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
                Turns your prompt into a trajectory (e.g. &quot;let me
                grep/search for where this code might be&quot;)
              </li>
              <li>
                Tries to guess what you{"'"}re referencing and edits the code
              </li>
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
                <span className="text-neutral-300 font-medium">
                  Prompt better:
                </span>{" "}
                Use @ to add additional context, write longer and more specific
                prompts (this is something YOU control)
              </li>
              <li>
                <span className="text-neutral-300 font-medium">
                  Make the agent better at codebase search
                </span>{" "}
                (e.g. Instant Grep, SWE-Grep - this is something model/agent
                PROVIDERS control)
              </li>
            </ul>

            <p>
              Improving the agent is a <em>lot</em> of unsolved research
              problems. It involves training better models (see{" "}
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
              Ultimately, reducing the amount of translation steps required
              makes the process faster and more accurate (this scales with
              codebase size).
            </p>

            <p>But what if there was a different way?</p>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
                Digging through React internals
              </h3>
              <p>
                In my ad-hoc tests, I noticed that referencing the file path
                (e.g.{" "}
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
                <span className="text-neutral-300 font-medium">much</span>{" "}
                faster at finding what I was referencing. In short - there are
                shortcuts to reduce the number of steps needed to search!
              </p>
              <p>
                Turns out, React.js exposes the source location for elements on
                the page. React Grab walks up the component tree from the
                element you clicked, collects each component&apos;s component
                name and source location (file path + line number), and formats
                that into a readable stack.
              </p>
              <p>It looks something like this:</p>
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="px-3 py-2">
                  <div className="font-mono text-xs overflow-x-auto">
                    {highlightedReactInternalsCode ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: highlightedReactInternalsCode,
                        }}
                        className="highlighted-code"
                      />
                    ) : (
                      <pre className="text-neutral-300 whitespace-pre">
                        {reactInternalsCodeExample}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
              <p>
                When I passed this to Cursor, it <em>instantly</em> found the
                file and made the change in a couple seconds. Trying on a couple
                other cases got the same result.
              </p>
              <div className="py-12">
                <Image src={demoGif} alt="demo gif" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200 mt-4">
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
                as the test codebase. This is a Next.js application with auth,
                data tables, charts, and form components.
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
                designed to cover a wide range of UI element retrieval
                scenarios. Each test represents a real-world task that
                developers commonly perform when working with coding agents.
              </p>
              <p>
                Each test ran twice: once with React Grab enabled (treatment),
                once without (control). Both conditions used identical codebases
                and Claude 4.5 Sonnet (in Claude Code).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-16">
        <div className="mx-auto max-w-4xl">
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
                    {highlightedCode ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: highlightedCode }}
                        className="highlighted-code"
                      />
                    ) : (
                      <pre className="text-neutral-300 whitespace-pre">
                        {codeExample}
                      </pre>
                    )}
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

      <div className="px-4 sm:px-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-6 text-neutral-400">
          <p>
            Without React Grab, the agent must search through the codebase to
            find the right component. Since language models predict tokens
            non-deterministically, this search process varies dramatically -
            sometimes finding the target instantly, other times requiring
            multiple attempts. This unpredictability adds latency, increases
            token consumption, and degrades overall performance.
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
              55% faster with React Grab
            </span>
            !
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-12">
        <div className="mx-auto max-w-2xl">
          <BenchmarkCharts results={resultsData as BenchmarkResult[]} />
        </div>
      </div>

      <div className="px-4 sm:px-8 mb-16">
        <div className="mx-auto max-w-2xl flex flex-col gap-6 text-neutral-400">
          <p>
            Below are the latest measurement results from all 20 test cases. The
            table below shows a detailed breakdown comparing performance metrics
            (time, tool calls, tokens) between the control and treatment groups,
            with speedup percentages indicating how much faster React Grab made
            the agent for each task.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <BenchmarkDetailedTable
            results={resultsData as BenchmarkResult[]}
            testCaseMap={testCaseMapping}
            lastRunDate="November 20, 2025 at 12:17 PM"
          />
        </div>
      </div>

      <div className="px-4 sm:px-8 pt-8">
        <div className="mx-auto max-w-2xl">
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
      </div>

      <div className="px-4 sm:px-8 pt-16 pb-56">
        <div className="mx-auto max-w-2xl flex flex-col gap-6 text-neutral-400">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-medium text-neutral-200">
              How it impacts you
            </h3>
            <p>
              The best use case I&apos;ve seen for React Grab is for low-entropy
              adjustments like: spacing, layout tweaks, or minor visual changes.
            </p>
            <p>
              If you iterate on UI frequently, this can make everyday changes
              feel smoother. Instead of describing where the code is, you can
              select an element and give the agent an exact starting point.
            </p>
            <p>
              We&apos;re finally moves things a bit closer to narrowing the
              intent to output gap (see{" "}
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
            <h3 className="text-lg font-medium text-neutral-200">
              What&apos;s next
            </h3>
            <p>
              There are a lot of improvements that can be made to this
              benchmark:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                Different codebases (this benchmark used shadcn dashboard) -
                what happens with different frameworks/sizes/patterns? Need to
                run it on more repos.
              </li>
              <li>Different agents/model providers</li>
              <li>
                Multiple trials and sampling - decrease variance, since agents
                are non-deterministic
              </li>
            </ul>
            <p>
              On the React Grab side - there&apos;s also a bunch of stuff that
              could make this even better. For example, grabbing error stack
              traces when things break, or building a Chrome extension so you
              don&apos;t need to modify your app at all. Maybe add screenshots
              of the element you&apos;re grabbing, or capture runtime
              state/props.
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
            <p className="italic text-neutral-500">
              I&apos;m also very open to fixing issues with the benchmarks. If you spot
              anything off, please{" "}
              <a
                href="mailto:aiden.ybai@gmail.com"
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
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-medium text-neutral-200">Try it out</h3>
            <p>React Grab is free and open source. Go try it out!</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-neutral-300 hover:text-white transition-colors w-fit underline"
              >
                <ArrowLeft size={16} />
                View demo
              </Link>
            </div>
            <div className="flex gap-2">
              <GithubButton />
              <CursorInstallButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

BlogPostPage.displayName = "BenchmarksPage";

export default BlogPostPage;
