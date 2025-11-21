"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactGrabLogo from "@/public/logo.svg";
import { highlightCode } from "@/lib/shiki";
import { BenchmarkCharts } from "@/components/benchmarks/benchmark-charts";
import { BenchmarkDetailedTable } from "@/components/benchmarks/benchmark-detailed-table";
import { BenchmarkResult, TestCase } from "@/components/benchmarks/types";
import { GithubButton } from "@/components/github-button";
import { CursorInstallButton } from "@/components/cursor-install-button";
import resultsData from "@/public/results.json";
import testCasesData from "@/public/test-cases.json";
import ReactGrabDemoGif from "@/public/demo.gif";

const BlogPostPage = () => {
  const [highlightedCode, setHighlightedCode] = useState<string>("");

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

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <div className="px-4 sm:px-8 pt-12 sm:pt-16">
        <div className="mx-auto max-w-2xl flex flex-col gap-6">
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Home
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
              <span>November 21, 2024</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-neutral-400">
            <p>
              I{"'"}ve been using a lot of Cursor/Claude Code lately and I{"'"}ve
              found doing frontend stuff has been... really annoying (to say the
              least). It{"'"}ll{" "}
              <code className="text-neutral-300 text-sm bg-neutral-900/50 px-1.5 py-0.5 rounded">
                grep
              </code>{" "}
              , pattern match on some{" "}
              <code className="text-neutral-300 text-sm bg-neutral-900/50 px-1.5 py-0.5 rounded">
                className
              </code>
              , and stumbles around a bunch of random files.
            </p>

            <p>
              My main problem with coding agents today is that translating that
              intent (from UI → prompt → code → UI) is very lossy. If I say
              something like "edit this button." which button would it be? There
              could be multiple button defintions and usages across the whole
              codebase. Prompting feels very tedious and watching the agent
              stumble around my codebase every time costs time and money.
            </p>

            <p>
              I solved this by adding a overlay in my UI where I can select any
              element on the page and copy the metadata (HTML and source file)
              to my clipboard. This way, instead of prompting where the code is,
              I just told it what I wanted to change.
            </p>

            <p>Here's how it looks:</p>

            <div>
              <Image src={ReactGrabDemoGif} alt="demo gif" />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-medium text-neutral-200">
                How does it work?
              </h3>
              <p>
                To make this work, I went into the React DevTools source. React
                already maintains the component tree internally; the missing
                piece is a way to read it at runtime. That became{" "}
                <a
                  href="https://github.com/aidenybai/bippy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  bippy
                </a>
                , a library that hooks into React&apos;s internals and extracts
                the fiber tree with source locations.
              </p>
              <p>
                React Grab uses bippy to walk up the component tree from the
                element you clicked, collect each component&apos;s display name
                and source location (file path + line number), and format that
                into a readable stack. A small script listens for a ⌘C+click
                gesture in the browser to choose the starting element, and
                everything runs at runtime with no build step needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-12">
        <div className="mx-auto max-w-2xl">
          <BenchmarkCharts results={resultsData as BenchmarkResult[]} />
        </div>
      </div>

      <div className="px-4 sm:px-8">
        <div className="mx-auto max-w-2xl flex flex-col gap-6 text-neutral-400">
          <p>
            The difference is even bigger for complex stuff. That editable table
            cell test? Claude took 32 seconds without React Grab, 9 seconds with
            it. The OTP input with separators went from 16 seconds to 9.
          </p>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-medium text-neutral-200">
              Benchmark methodology
            </h3>
            <p>
              To measure React Grab&apos;s impact, I used the{" "}
              <a
                href="https://github.com/shadcn-ui/ui"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-white underline underline-offset-4"
              >
                shadcn/ui dashboard example
              </a>{" "}
              as the test codebase. This is a production-grade Next.js
              application with authentication flows, data tables, interactive
              charts, and complex form components.
            </p>
            <p>
              I created 20 test cases covering common UI element retrieval
              tasks. Each test case consists of a natural language prompt (e.g.,
              &quot;Find the forgot password link in the login form&quot;) and
              the expected component location. Each test was run twice: once
              with React Grab enabled (treatment), once without (control). Both
              conditions used identical codebases, identical prompts, and Claude
              3.5 Sonnet as the AI model.
            </p>
            <p>
              Metrics tracked: input tokens, output tokens, cost (USD), duration
              (ms), number of tool calls, and task success. All tests were
              automated and run sequentially to ensure consistent conditions.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-medium text-neutral-200">
              Example test case
            </h3>
            <div className="flex flex-col gap-2">
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-neutral-300">
                &quot;Find the forgot password link in the login form&quot;
              </div>
              <div className="text-xs text-neutral-500">
                → Expected: components/login-form.tsx:46:19
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-medium text-neutral-200">
              Without React Grab vs with it
            </h3>
            <p>
              The control group (no React Grab) is painful to watch. Claude
              reads like 3-4 component files, greps around, tries to match text
              content, backtracks when it&apos;s wrong. Takes forever and burns
              tokens.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-8">
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
        <div className="mx-auto max-w-2xl flex flex-col gap-3 text-sm text-neutral-400">
          <p>
            Without React Grab, the agent has to guess. It reads files, greps
            for patterns, reads more files when the first ones are wrong. Each
            additional tool call adds latency and token cost. Performance varies
            wildly depending on whether the agent&apos;s search strategy gets
            lucky.
          </p>
          <p>
            With React Grab, there&apos;s no search phase. The component stack
            is already in the DOM with exact file paths and line numbers. The
            agent reads exactly one file and finds what it needs immediately.
            Performance becomes consistent and predictable regardless of
            component complexity.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-12">
        <div className="mx-auto max-w-2xl flex flex-col gap-3">
          <h3 className="text-lg font-medium text-neutral-200">Results</h3>
          <p className="text-sm text-neutral-400">
            Here are the latest measurement results from all 20 test cases. Each
            row shows control vs. treatment metrics with percentage
            improvements.
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

      <div className="px-4 sm:px-8 pt-24 pb-56">
        <div className="mx-auto max-w-2xl flex flex-col gap-6 text-neutral-400">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-medium text-neutral-200">
              Interesting patterns
            </h3>
            <p>
              Looking through the data, a few things stood out. The simpler
              tests (like finding a button or link) showed the biggest
              improvements - React Grab cut tool calls from 5-8 down to just 1.
              Makes sense. When the AI doesn&apos;t have to guess, it&apos;s way
              more efficient.
            </p>
            <p>
              Complex UI components were interesting too. The editable table
              cell test? Without React Grab, Claude made 13 tool calls and took
              32 seconds. With it, 1 tool call and 9 seconds. Same with the OTP
              input with separators - went from 4 tool calls to 1.
            </p>
            <p>
              Token usage is probably the most surprising metric. React Grab
              consistently uses fewer tokens even though it&apos;s adding extra
              context to the message. Why? Because the AI doesn&apos;t need to
              read through multiple component files anymore. It already knows
              where to look.
            </p>
            <p>
              A couple tests showed minimal improvement (Time Range Toggle, Tabs
              with Badges). Looking at the control runs, Claude actually got
              lucky and found these pretty fast. But that&apos;s the thing -
              with React Grab you don&apos;t rely on luck. Every test completes
              in roughly the same time regardless of complexity.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-medium text-neutral-200">
              What&apos;s next
            </h3>
            <p>
              This benchmark only tested on one codebase (shadcn dashboard).
              Would be interesting to run it on more repos - different
              frameworks, different component patterns, different sizes. See if
              the improvements hold up across the board.
            </p>
            <p>
              There&apos;s also a bunch of stuff that could make this even
              better. Like grabbing error stack traces when things break, or
              building a Chrome extension so you don&apos;t need to modify your
              app at all. Maybe add screenshots of the element you&apos;re
              grabbing, or capture runtime state/props. All that extra context
              would probably help AI agents even more.
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
            <h3 className="text-lg font-medium text-neutral-200">Try it out</h3>
            <p>
              React Grab is free and open source. Takes like 30 seconds to
              install - just add a script tag or npm package to your app. Then
              hold ⌘C and start grabbing elements.
            </p>
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
